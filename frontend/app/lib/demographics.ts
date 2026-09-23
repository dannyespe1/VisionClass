import { apiFetch } from "./api";

export type DemographicGender = "masculino" | "femenino" | "otro";

export type DemographicProfileStatus = {
  schema_version: "demographic-profile-v1";
  available: boolean;
  research_consent_granted: boolean;
  age_band: "18-20";
  gender_options: DemographicGender[];
  comparative_dimension: "gender_self_description";
  age_is_eligibility_only: true;
  registered: boolean;
  retention_until: string | null;
};

export function getDemographicProfile(token: string) {
  return apiFetch<DemographicProfileStatus>("/api/demographics/profile/", {}, token);
}

export function saveDemographicProfile(token: string, gender: DemographicGender) {
  return apiFetch<DemographicProfileStatus>(
    "/api/demographics/profile/",
    {
      method: "POST",
      body: JSON.stringify({
        age_band: "18-20",
        gender_self_description: gender,
        voluntary_confirmation: true,
      }),
    },
    token,
  );
}

export function deleteDemographicProfile(token: string) {
  return apiFetch<DemographicProfileStatus>(
    "/api/demographics/profile/",
    { method: "DELETE" },
    token,
  );
}
