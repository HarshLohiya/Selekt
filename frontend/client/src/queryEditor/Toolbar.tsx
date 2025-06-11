import React from 'react';
import ConnectionDropDown from './ConnectionDropdown';
import ToolbarChartButton from './ToolbarChartButton';
import ToolbarChatButton from './ToolbarChatButton';
import ToolbarConnectionClientButton from './ToolbarConnectionClientButton';
import ToolbarHistoryButton from './ToolbarHistoryButton';
import ToolbarQueryName from './ToolbarQueryName';
import ToolbarRunButton from './ToolbarRunButton';
import ToolbarCancelButton from './ToolbarCancelButton';
import ToolbarSpacer from './ToolbarSpacer';
import ToolbarToggleSchemaButton from './ToolbarToggleSchemaButton';
import ToolbarDarkModeButton from './ToolbarDarkModeButton';
import styles from './Toolbar.module.css';
import logoStyles from '../app-header/Logo.module.css';

function Toolbar() {
  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarInner}>
        <div className={logoStyles.toolbarLogo}>
          <ToolbarToggleSchemaButton />
        </div>
        <ConnectionDropDown />
        <ToolbarSpacer />
        <ToolbarConnectionClientButton />
        <ToolbarSpacer grow />
        <ToolbarQueryName />
        <ToolbarSpacer grow />
        <ToolbarRunButton />
        <ToolbarSpacer />
        <ToolbarCancelButton />
        <ToolbarSpacer />
        <ToolbarDarkModeButton />
        <ToolbarHistoryButton />
        <ToolbarChartButton />
        <ToolbarChatButton />
      </div>
    </div>
  );
}

export default React.memo(Toolbar);
