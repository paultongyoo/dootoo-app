import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { momentFromNow, isThingOverdue } from './Helpers';


const styles = StyleSheet.create({
  baseToast: {
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftColor: '#556B2F',
    backgroundColor: '#FAF3E0',
    borderRadius: 10,
    flexDirection: 'row',
    flex: 1
  },
  undoableToast: { 
    height: 50, 
    width: 230 
  },
  msgWithLink: {
    height: 50,
    padding: 15
  },
  timerInfo: {
    padding: 15
  },
  toastText: {
    fontSize: 16
  },
  toastLink: {
    fontWeight: 'bold',
    color: '#A23E48',
    textDecorationLine: 'underline',
    fontSize: 16
  },
  timerIconContainer: {
    justifyContent: 'center',
    paddingRight: 10
  },
  timerIcon: {
    height: 16,
    width: 16
  }
});

const toastConfig = {
  undoableToast: ({ text1 = '', props }) => (
    <View style={[styles.baseToast, styles.undoableToast]}>
      <Text style={styles.toastText}>{text1}     </Text>
      <Pressable onPress={props.onUndoPress}>
        <Text style={styles.toastLink}>undo</Text>
      </Pressable>
    </View>
  ),
  msgWithLink: ({ text1 = '', props }) => (
    <View style={[
      styles.baseToast, 
      styles.msgWithLink,
      { width: (props.width) ? props.width : 190 }]}>
      <Text style={styles.toastText}>{text1}</Text>
      {(props.linkText) ?
        <Pressable onPress={props.onLinkPress}>
          <Text style={styles.toastLink}>{props.linkText}</Text>
        </Pressable> : <></>
      }
    </View>
  ),
  timerInfo: ({ props }) => (
    <View style={[styles.baseToast, styles.timerInfo]}>
      <View style={styles.timerIconContainer}>
        <Image style={styles.timerIcon} source={(isThingOverdue(props.thing)) 
                                                  ? require("@/assets/images/timer_icon_FF0000.png") 
                                                  : require("@/assets/images/timer_icon_556B2F.png")
                                                  } />
      </View>
      <Text style={styles.toastText}>{momentFromNow(props.thing)}</Text>
    </View>
  )
};

export default toastConfig;