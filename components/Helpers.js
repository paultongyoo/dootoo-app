
export const formatNumber = (num) => {
    if (num < 1000) return num.toString();
    if (num < 1_000_000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    if (num < 1_000_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num < 1_000_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
    return (num / 1_000_000_000_000).toFixed(1).replace(/\.0$/, '') + 'T';
}

export const showComingSoonAlert = (featureName) => {
    Alert.alert(
      `${featureName} Feature Coming Soon`, // Title of the alert
      "Look for this in a future release.  We've noted you're looking for it.  Thanks!", // Message of the alert
      [
        {
          text: 'OK',
          onPress: () => {
            //console.log('Data Deletion OK Pressed');
            amplitude.track("Coming Soon Popup Displayed", {
              anonymous_id: anonymousId,
              pathname: pathname,
              featureName: featureName
            });
          },
        },
      ],
      { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
    );
  };