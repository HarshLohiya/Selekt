import ChatIcon from 'mdi-react/ChatIcon';
import React from 'react';
import IconButton from '../common/IconButton';
import { toggleChatSidebar } from '../stores/editor-actions';

function ToolbarChatButton() {
  return (
    <IconButton
      tooltip="Open AI Chat"
      onClick={() => toggleChatSidebar()}
    >
      <ChatIcon />
    </IconButton>
  );
}

export default ToolbarChatButton; 