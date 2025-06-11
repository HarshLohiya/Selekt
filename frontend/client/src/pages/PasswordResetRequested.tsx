import React from 'react';
import FullscreenMessage from '../common/FullscreenMessage';

const PasswordResetRequested = () => {
  document.title = 'selekt - Password Reset';
  return (
    <FullscreenMessage>
      <p>Password reset requested.</p>
      <p>An email has been sent with further instruction.</p>
    </FullscreenMessage>
  );
};

export default PasswordResetRequested;
