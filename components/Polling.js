import { useEffect, useRef } from "react";

const usePolling = (pollingFn, interval = 60000) => {
  const timeoutRef = useRef(null);
  const isPolling = useRef(false);

  const startPolling = () => {
    //console.log("startPolling called");
    if (isPolling.current) return; // Prevent duplicate polling
    if (timeoutRef.current) {
      stopPolling();
    }
    isPolling.current = true;
    pollingFn();
    timeoutRef.current = setInterval(pollingFn, interval);
    //console.log("New Interval Set: " + timeoutRef.current);
  };

  const restartPolling = () => {
    //console.log("restartPolling called");
    if (isPolling.current) {
        stopPolling();
        startPolling();
    } else {
        startPolling();
    }
  }

  const stopPolling = () => {
    //console.log("stopPolling called");
    if (timeoutRef.current) {
      //console.log("Clearing interval: " + timeoutRef.current);
      clearInterval(timeoutRef.current);
      timeoutRef.current = null;
    }
    isPolling.current = false;
  };

  useEffect(() => {
    //console.log("Polling hook mounting");
    startPolling();

    // Cleanup on unmount
    return () => {
      //console.log("Polling hook unmounting");
      stopPolling();
    }
  }, [pollingFn, interval]);

  return { startPolling, stopPolling, restartPolling };
};

export default usePolling;
