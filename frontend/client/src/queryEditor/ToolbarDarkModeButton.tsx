import React from 'react';
import IconButton from '../common/IconButton';
import { useDarkMode, useEditorStore } from '../stores/editor-store';
import WeatherSunnyIcon from 'mdi-react/WeatherSunnyIcon';
import WeatherNightIcon from 'mdi-react/WeatherNightIcon';

function ToolbarDarkModeButton() {
  const isDarkMode = useDarkMode();

  return (
    <IconButton
      tooltip={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => useEditorStore.getState().toggleDarkMode()}
    >
      {isDarkMode ? <WeatherSunnyIcon /> : <WeatherNightIcon />}
    </IconButton>
  );
}

export default React.memo(ToolbarDarkModeButton); 