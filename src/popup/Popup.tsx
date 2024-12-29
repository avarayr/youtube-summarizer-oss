import React from "react";
import { SettingsPanel } from "../shared/components/SettingsPanel";

export const Popup: React.FC = () => {
  return (
    <div className="popup-container">
      <SettingsPanel
        showHeader={false}
        className="popup-settings"
        onProviderChange={() => {}}
        onModelChange={() => {}}
      />
    </div>
  );
};
