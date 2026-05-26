export const PipViewStyles = () => (
  <style>{`
    @keyframes pulse-custom { 50% { opacity: .6; } }
    .animate-pulse-custom { animation: pulse-custom 2s cubic-bezier(0.4, 0.6, 1) infinite; }
    @keyframes pulse-idle {
      0% {
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5);
      }
      70% {
        box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
      }
    }
    .animate-pulse-idle {
      animation: pulse-idle 2s infinite;
    }
  `}</style>
);
