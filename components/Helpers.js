import { Alert } from "react-native";
import * as amplitude from '@amplitude/analytics-react-native';

export const formatNumber = (num) => {
    if (!num) return null;
    if (num < 1000) return num.toString();
    if (num < 1_000_000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    if (num < 1_000_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num < 1_000_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
    return (num / 1_000_000_000_000).toFixed(1).replace(/\.0$/, '') + 'T';
}

export const showComingSoonAlert = (anonymousId, featureName, pathname) => {

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

  export const moveItemToTopOfDAWNKS = (itemList, item_uuid) => {
    const itemIdx = itemList.findIndex((obj) => obj.uuid == item_uuid);
    const [movedItem] = itemList.splice(itemIdx, 1);
    const dawnks = itemList.filter((obj) => obj.is_done && !obj.parent_item_uuid);
    if (dawnks.length == 0) {
      return itemList.concat(movedItem);
    } else {
      const firstDAWNKIdx = itemList.findIndex((obj) => obj.uuid == dawnks[0].uuid);
      itemList.splice(firstDAWNKIdx, 0, movedItem);
      return itemList;
    }   
  }