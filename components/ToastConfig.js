import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Toast } from 'react-native-toast-message';

const toastConfig = {
  undoableToast: ({ text1 = '', props }) => (
    <View style={{ 
        height: 60,
        width: 275,
        justifyContent: 'center',
        alignItems: 'center',
        borderLeftColor: '#556B2F', 
        backgroundColor: '#FAF3E0', 
        borderRadius: 5,
        flexDirection: 'row', 
        flex: 1 }}>
      <Text style={{
            fontSize: 16
         }}>{text1}     </Text>
      <Pressable onPress={props.onUndoPress}>
        <Text style={{
            fontWeight: 'bold', 
            color: '#A23E48', 
            textDecorationLine: 'underline',
            fontSize: 16}}>undo</Text>
      </Pressable>
    </View>
  )
};

export default toastConfig;