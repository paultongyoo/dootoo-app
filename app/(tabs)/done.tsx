import { useEffect } from 'react';
import { Text } from 'react-native';

const DoneScreen = () => {

    useEffect(() => {
        console.log("DoneScreen.useEffect([])");
    }, []);

    return (
        <Text>Done Screen to be built!</Text>
    )
}

export default DoneScreen;