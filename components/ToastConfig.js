import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { momentFromNow, isThingOverdue } from './Helpers';
import Toast from 'react-native-toast-message';

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
  },
  timerText_overdue: {
    fontWeight: 'bold',
    color: '#FF0000'
  },
  timerEditIconContainer: {
    justifyContent: 'center',
    paddingRight: 10,
    paddingLeft: 20
  },
  timerEditIcon: {
    height: 16,
    width: 16
  },
  calendarIconContainer: {
    justifyContent: 'center',
    paddingLeft: 10
  },
  calendarIcon: {
    height: 16,
    width: 16
  }
});

const toastConfig = {
  undoableToast: ({ text1 = '', props }) => (
    <View style={[styles.baseToast, styles.undoableToast]}>
      <Text onPress={() => Toast.hide()} style={styles.toastText}>{text1}     </Text>
      <Pressable hitSLop={10} onPress={props.onUndoPress}>
        <Text style={styles.toastLink}>undo</Text>
      </Pressable>
    </View>
  ),
  msgWithLink: ({ text1 = '', props }) => (
    <View style={[
      styles.baseToast, 
      styles.msgWithLink,
      { width: (props.width) ? props.width : 190 }]}>
      <Text onPress={() => Toast.hide()} style={styles.toastText}>{text1}</Text>
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
        <Image style={styles.timerIcon} source={(isThingOverdue(props.thing) && !props.thing.is_done) 
                                                  ? require("@/assets/images/timer_icon_FF0000.png") 
                                                  : require("@/assets/images/timer_icon_556B2F.png")
                                                  } />
      </View>
      <Text onPress={() => Toast.hide()} style={[styles.toastText, isThingOverdue(props.thing) && !props.thing.is_done && styles.timerText_overdue]}>{momentFromNow(props.thing)}</Text>
        <Pressable hitSLop={10} style={styles.timerEditIconContainer}
                     onPress={props.onEditIconClick}>
            <Image style={styles.timerEditIcon} source={require("@/assets/images/edit_icon_A23E48.png")} />
        </Pressable>  
        <Pressable hitSLop={10} style={styles.calendarIconContainer}
                     onPress={props.onCalendarIconClick}>
            <Image style={styles.calendarIcon} source={(!props.thing.event_id) 
                                                  ? require("@/assets/images/calendar_A23E48.png")    // TODO Create better image
                                                  : require("@/assets/images/calendar_A23E48.png")
                                                  } />
        </Pressable>                                    
    </View>
  )
};

export default toastConfig;