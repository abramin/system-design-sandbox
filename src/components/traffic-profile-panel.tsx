import type { TrafficProfile } from "../types/system";
import "./traffic-profile-panel.css";

interface TrafficProfilePanelProps {
  profile: TrafficProfile;
  onProfileChange: (profile: TrafficProfile) => void;
  onApplyProfile: () => void;
}

export default function TrafficProfilePanel({
  profile,
  onProfileChange,
  onApplyProfile,
}: TrafficProfilePanelProps) {
  const handleFieldChange = (field: keyof TrafficProfile, value: number) => {
    onProfileChange({
      ...profile,
      [field]: value,
    });
  };

  return (
    <div className="traffic-panel">
      <div className="traffic-panel-header">
        <h3>Traffic Profile</h3>
        <button type="button" onClick={onApplyProfile} className="traffic-apply-btn">
          Apply
        </button>
      </div>
      <label className="traffic-field">
        Base DAUs
        <input
          type="number"
          min={1000}
          max={5000000000}
          value={profile.baseDAUs}
          onChange={(event) => handleFieldChange("baseDAUs", Number(event.target.value))}
        />
      </label>
      <label className="traffic-field">
        Peak Activity (% of DAUs)
        <input
          type="range"
          min={1}
          max={200}
          value={profile.peakPercent}
          onChange={(event) => handleFieldChange("peakPercent", Number(event.target.value))}
        />
        <span className="traffic-field-value">{profile.peakPercent}%</span>
      </label>
      <label className="traffic-field">
        Write Ratio
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(profile.writeRatio * 100)}
          onChange={(event) => handleFieldChange("writeRatio", Number(event.target.value) / 100)}
        />
        <span className="traffic-field-value">{Math.round(profile.writeRatio * 100)}%</span>
      </label>
      <label className="traffic-field">
        Avg Message Size (bytes)
        <input
          type="number"
          min={64}
          max={10485760}
          step={64}
          value={profile.messageSizeBytes}
          onChange={(event) => handleFieldChange("messageSizeBytes", Number(event.target.value))}
        />
      </label>
      {profile.bursts.length > 0 && (
        <div className="traffic-burst-list">
          <div className="traffic-burst-list-header">
            <span>Burst</span>
            <span>Multiplier</span>
            <span>Duration</span>
          </div>
          {profile.bursts.map((burst) => (
            <div key={burst.label} className="traffic-burst-row">
              <span>{burst.label}</span>
              <span>{burst.multiplier.toFixed(1)}×</span>
              <span>{burst.durationSeconds}s</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
