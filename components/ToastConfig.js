import React from 'react';
import { View, Text, Pressable } from 'react-native';

const toastConfig = {
  undoableToast: ({ text1 = '', props }) => (
    <View style={{ 
        height: 50,
        width: 230,
        justifyContent: 'center',
        alignItems: 'center',
        borderLeftColor: '#556B2F', 
        backgroundColor: '#FAF3E0', 
        borderRadius: 10,
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
  ),
  msgOnlyToast: ({ text1 = '', props }) => (
    <View style={{ 
        height: 50,
        width: 190,
        padding: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderLeftColor: '#556B2F', 
        backgroundColor: '#FAF3E0', 
        borderRadius: 10,
        flexDirection: 'row', 
        flex: 1 }}>
      <Text style={{
            fontSize: 16
         }}>{text1}</Text>
    </View>
  )
};

export default toastConfig;