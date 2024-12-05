import { useEffect, useRef } from "react";

const usePolling = (pollingFn, interval = 60000) => {
  const timeoutRef = useRef(null);
  const isPolling = useRef(false);

  const startPolling = () => {
    //console.log("startPolling called");
    if (isPolling.current) return; // Prevent duplicate polling
    isPolling.current = true;

    const poll = async () => {
      try {
        await pollingFn();
      } catch (error) {
        console.error("Polling error:", error);
      } finally {
        timeoutRef.current = setTimeout(poll, interval);
      }
    };

    poll(); // Start the first poll
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
      clearTimeout(timeoutRef.current);
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
