
import argparse
import json
from pathlib import Path
from typing import List, Tuple

import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms, models
from PIL import Image
import random
import numpy as np


class FrameSequenceDataset(Dataset):
    def __init__(self, df: pd.DataFrame, seq_len: int, transform=None):
        self.df = df
        self.seq_len = seq_len
        self.transform = transform

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        paths: List[str] = row["frames_paths"]
        mask: List[int] = row["mask"]
        y = float(row["y"])
        imgs = []
        for p in paths:
            img = Image.open(p).convert("RGB")
            if self.transform:
                img = self.transform(img)
            imgs.append(img)
        x = torch.stack(imgs, dim=0)  # (T, C, H, W)
        mask_tensor = torch.tensor(mask, dtype=torch.float32)
        return x, mask_tensor, torch.tensor(y, dtype=torch.float32), row["user_id"]


class CNNLSTM(nn.Module):
    def __init__(self, embedding_dim=256, hidden_dim=128, num_layers=1):
        super().__init__()
        backbone = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
        backbone.classifier = nn.Identity()
        self.encoder = backbone
        enc_out = backbone.features[-1][-1].out_channels
        self.proj = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Linear(enc_out, embedding_dim),
            nn.ReLU(inplace=True),
        )
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, num_layers=num_layers, batch_first=True)
        self.head = nn.Sequential(
            nn.Linear(hidden_dim, 64),
            nn.ReLU(inplace=True),
            nn.Linear(64, 1),
            nn.Sigmoid(),
        )

    def forward(self, x, mask=None):
        # x: (B, T, C, H, W)
        b, t, c, h, w = x.shape
        x = x.view(b * t, c, h, w)
        feats = self.encoder(x)  # (b*t, C, H', W')
        feats = self.proj(feats)  # (b*t, E)
        feats = feats.view(b, t, -1)  # (b, t, E)
        lstm_out, _ = self.lstm(feats)
        # many-to-one: take last hidden
        last = lstm_out[:, -1, :]
        out = self.head(last).squeeze(1)
        if mask is not None:
            # if all masked, zero out
            valid = mask.sum(dim=1) > 0
            out = out * valid.float()
        return out


def split_by_user(df: pd.DataFrame, val_ratio=0.2, test_ratio=0.1):
    users = df["user_id"].unique().tolist()
    random.shuffle(users)
    n = len(users)
    val_n = int(n * val_ratio)
    test_n = int(n * test_ratio)
    test_users = set(users[:test_n])
    val_users = set(users[test_n : test_n + val_n])
    train_users = set(users[test_n + val_n :])
    def subset(user_set):
        return df[df["user_id"].isin(user_set)]
    return subset(train_users), subset(val_users), subset(test_users)


def collate_fn(batch):
    xs, masks, ys, users = zip(*batch)
    x = torch.stack(xs, dim=0)
    m = torch.stack(masks, dim=0)
    y = torch.stack(ys, dim=0)
    return x, m, y, users


def train_one_epoch(model, loader, optimizer, criterion, device):
    model.train()
    total_loss = 0.0
    for x, mask, y, _ in loader:
        x, mask, y = x.to(device), mask.to(device), y.to(device)
        pred = model(x, mask)
        loss = criterion(pred, y)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * x.size(0)
    return total_loss / len(loader.dataset)


@torch.no_grad()
def eval_model(model, loader, criterion, device):
    model.eval()
    total_loss = 0.0
    preds = []
    trues = []
    for x, mask, y, _ in loader:
        x, mask, y = x.to(device), mask.to(device), y.to(device)
        pred = model(x, mask)
        loss = criterion(pred, y)
        total_loss += loss.item() * x.size(0)
        preds.append(pred.cpu())
        trues.append(y.cpu())
    if preds:
        preds = torch.cat(preds)
        trues = torch.cat(trues)
        mae = torch.mean(torch.abs(preds - trues)).item()
    else:
        mae = 0.0
    return total_loss / len(loader.dataset), mae


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=str, required=True, help="Parquet de frames_dataset")
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch", type=int, default=4)
    parser.add_argument("--seq-len", type=int, default=16)
    parser.add_argument("--lr", type=float, default=1e-3)
    args = parser.parse_args()

    df = pd.read_parquet(args.data)
    # asegurar listas
    df["frames_paths"] = df["frames_paths"].apply(lambda x: x if isinstance(x, list) else json.loads(x))
    df["mask"] = df["mask"].apply(lambda x: x if isinstance(x, list) else json.loads(x))

    train_df, val_df, test_df = split_by_user(df)

    transform = transforms.Compose(
        [
          transforms.Resize((224, 224)),
          transforms.ColorJitter(brightness=0.1, contrast=0.1),
          transforms.GaussianBlur(kernel_size=3, sigma=0.5),
          transforms.ToTensor(),
        ]
    )

    train_ds = FrameSequenceDataset(train_df, args.seq_len, transform=transform)
    val_ds = FrameSequenceDataset(val_df, args.seq_len, transform=transform)
    test_ds = FrameSequenceDataset(test_df, args.seq_len, transform=transform)

    train_loader = DataLoader(train_ds, batch_size=args.batch, shuffle=True, collate_fn=collate_fn)
    val_loader = DataLoader(val_ds, batch_size=args.batch, shuffle=False, collate_fn=collate_fn)
    test_loader = DataLoader(test_ds, batch_size=args.batch, shuffle=False, collate_fn=collate_fn)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = CNNLSTM()
    model.to(device)

    criterion = nn.HuberLoss()
    optimizer = optim.Adam(model.parameters(), lr=args.lr)

    best_val = float("inf")
    ckpt_dir = Path("checkpoints")
    ckpt_dir.mkdir(exist_ok=True)

    for epoch in range(1, args.epochs + 1):
        train_loss = train_one_epoch(model, train_loader, optimizer, criterion, device)
        val_loss, val_mae = eval_model(model, val_loader, criterion, device)
        print(f"Epoch {epoch}: train_loss={train_loss:.4f} val_loss={val_loss:.4f} val_mae={val_mae:.4f}")
        if val_loss < best_val:
            best_val = val_loss
            torch.save(model.state_dict(), ckpt_dir / "cnn_lstm.pth")

    # Eval final
    test_loss, test_mae = eval_model(model, test_loader, criterion, device)
    metrics = {"val_best": best_val, "test_loss": test_loss, "test_mae": test_mae}
    with open(ckpt_dir / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
    print("Metrics:", metrics)

    # Export ONNX (uso many-to-one)
    dummy = torch.randn(1, args.seq_len, 3, 224, 224, device=device)
    torch.onnx.export(
        model,
        (dummy, None),
        ckpt_dir / "cnn_lstm.onnx",
        input_names=["frames", "mask"],
        output_names=["score"],
        opset_version=17,
        dynamic_axes={"frames": {0: "batch", 1: "seq"}, "score": {0: "batch"}},
    )


if __name__ == "__main__":
    main()
