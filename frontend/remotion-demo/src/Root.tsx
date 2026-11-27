import React from 'react';
import { Composition } from 'remotion';
import { MailroomDemo } from './Composition';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MailroomDemo"
      component={MailroomDemo}
      durationInFrames={360}
      fps={30}
      width={1280}
      height={720}
    />
  );
};
