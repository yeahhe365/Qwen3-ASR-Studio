type StoppableMediaTrack = {
  stop: () => void;
};

type StoppableMediaStream = {
  getTracks: () => StoppableMediaTrack[];
};

export const stopMediaStreamTracks = (stream: StoppableMediaStream | null | undefined) => {
  stream?.getTracks().forEach((track) => track.stop());
};
