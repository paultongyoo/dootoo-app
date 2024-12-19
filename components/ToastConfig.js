import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { momentFromNow, isThingOverdue } from './Helpers';
import { Calendar } from './svg/calendar';
import { CalendarAdd } from './svg/calendar-add';
import { Edit } from './svg/edit';
import { Clock } from './svg/clock';
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
    marginLeft: 20,
    marginRight: 20,
    padding: 15,
    alignContent: 'center'
  },
  msgWithLink: {
    height: 50,
    padding: 15
  },
  msgOpenWidth: {
    marginLeft: 20,
    marginRight: 20,
    padding: 15,
    alignContent: 'center'
  },
  timerInfo: {
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 15,
    paddingRight: 10
  },
  toastText: {
    fontSize: 16,
    textAlign: 'center'
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
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 20
  },
  timerEditIcon: {
    height: 16,
    width: 16
  },
  calendarIconContainer: {
    justifyContent: 'center',
    padding: 10
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
      <Pressable hitSLop={10} onPress={props.onUndoClick}>
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
  msgOpenWidth: ({ text1 = '' }) => (
    <View style={[
      styles.baseToast,
      styles.msgOpenWidth]}>
      <Text onPress={() => Toast.hide()} style={styles.toastText}>{text1}</Text>
    </View>
  ),
  timerInfo: ({ props }) => (
    <View style={[styles.baseToast, styles.timerInfo]}>
      <View style={styles.timerIconContainer}>
          {(isThingOverdue(props.thing) && !item.is_done)
              ? <Clock wxh="20" color="#FF0000" />
              :  <Clock wxh="20" color="#556B2F" />
          }
      </View>
      <Text onPress={() => Toast.hide()} style={[styles.toastText, isThingOverdue(props.thing) && !props.thing.is_done && styles.timerText_overdue]}>{momentFromNow(props.thing)}</Text>
      <Pressable hitSLop={10} style={({ pressed }) => [styles.timerEditIconContainer/*, pressed && { backgroundColor: '#000' }*/]}
        onPress={props.onEditIconClick}>
        <Edit wxh="20" color="#A23E38" />
      </Pressable>
      <Pressable hitSLop={10} style={({ pressed }) => [styles.calendarIconContainer/*, pressed && { backgroundColor: '#000' }*/]}
        onPress={props.onCalendarIconClick}>
        {(!props.thing.event_id) ? <CalendarAdd wxh="20" color="#A23E38" />    // TODO Create better image
          : <Calendar wxh="20" color="#A23E38" />
        }
      </Pressable>
    </View>
  )
};

export default toastConfig;