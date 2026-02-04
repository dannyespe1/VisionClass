import os
import json
from pathlib import Path
from typing import List

import numpy as np
import pandas as pd
import cv2
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader


DATASET_PATH = os.environ.get("TRAIN_DATASET", "data/frames_dataset.parquet")
OUTPUT_PATH = os.environ.get("MODEL_PATH", "checkpoints/cnn_lstm.onnx")
IMG_SIZE = int(os.environ.get("MODEL_IMG_SIZE", "224"))
SEQ_LEN = int(os.environ.get("SEQUENCE_LENGTH", "16"))
EPOCHS = int(os.environ.get("TRAIN_EPOCHS", "1"))
BATCH_SIZE = int(os.environ.get("TRAIN_BATCH_SIZE", "4"))
LR = float(os.environ.get("TRAIN_LR", "1e-4"))


class FrameSeqDataset(Dataset):
    def __init__(self, df: pd.DataFrame, seq_len: int, img_size: int):
        self.df = df.reset_index(drop=True)
        self.seq_len = seq_len
        self.img_size = img_size

    def __len__(self) -> int:
        return len(self.df)

    def _load_frame(self, path: str) -> np.ndarray:
        img = cv2.imread(path)
        if img is None:
            img = np.zeros((self.img_size, self.img_size, 3), dtype=np.uint8)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = cv2.resize(img, (self.img_size, self.img_size))
        img = img.astype(np.float32) / 255.0
        return img

    def __getitem__(self, idx: int):
        row = self.df.iloc[idx]
        frames = row["frames_paths"]
        if isinstance(frames, str):
            try:
                frames = json.loads(frames)
            except Exception:
                frames = []
        frames = frames[: self.seq_len]
        if len(frames) < self.seq_len:
            frames = frames + [frames[-1]] * (self.seq_len - len(frames)) if frames else []
        if not frames:
            frames = ["" for _ in range(self.seq_len)]

        seq = np.stack([self._load_frame(p) for p in frames], axis=0)  # T,H,W,C
        seq = np.transpose(seq, (0, 3, 1, 2))  # T,C,H,W
        y = float(row.get("y", 0.0))
        return torch.tensor(seq, dtype=torch.float32), torch.tensor([y], dtype=torch.float32)


class TinyCNNLSTM(nn.Module):
    def __init__(self, img_size: int):
        super().__init__()
        self.cnn = nn.Sequential(
            nn.Conv2d(3, 8, kernel_size=3, stride=2, padding=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(8, 16, kernel_size=3, stride=2, padding=1),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d((1, 1)),
        )
        self.lstm = nn.LSTM(input_size=16, hidden_size=32, num_layers=1, batch_first=True)
        self.head = nn.Sequential(
            nn.Linear(32, 16),
            nn.ReLU(inplace=True),
            nn.Linear(16, 1),
            nn.Sigmoid(),
        )

    def forward(self, x):
        # x: B,T,C,H,W
        b, t, c, h, w = x.shape
        x = x.reshape(b * t, c, h, w)
        feats = self.cnn(x).reshape(b, t, -1)  # B,T,16
        out, _ = self.lstm(feats)
        last = out[:, -1, :]
        return self.head(last)


def main():
    dataset_path = Path(DATASET_PATH)
    if not dataset_path.exists():
        print(f"Dataset no encontrado: {dataset_path}")
        return

    df = pd.read_parquet(dataset_path)
    if df.empty:
        print("Dataset vacio, no se entrena.")
        return

    dataset = FrameSeqDataset(df, SEQ_LEN, IMG_SIZE)
    loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = TinyCNNLSTM(IMG_SIZE).to(device)
    optim = torch.optim.Adam(model.parameters(), lr=LR)
    loss_fn = nn.MSELoss()

    model.train()
    for epoch in range(EPOCHS):
        losses: List[float] = []
        for x, y in loader:
            x = x.to(device)
            y = y.to(device)
            optim.zero_grad()
            pred = model(x)
            loss = loss_fn(pred, y)
            loss.backward()
            optim.step()
            losses.append(float(loss.item()))
        mean_loss = sum(losses) / max(len(losses), 1)
        print(f"Epoch {epoch+1}/{EPOCHS} loss={mean_loss:.4f}")

    output_path = Path(OUTPUT_PATH)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    dummy = torch.zeros((1, SEQ_LEN, 3, IMG_SIZE, IMG_SIZE), dtype=torch.float32).to(device)
    torch.onnx.export(
        model,
        dummy,
        output_path.as_posix(),
        input_names=["frames"],
        output_names=["score"],
        opset_version=17,
    )
    print(f"Modelo exportado a {output_path}")


if __name__ == "__main__":
    main()
