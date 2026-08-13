import React, { forwardRef } from 'react';
import { View, StyleSheet, Image } from 'react-native';

export const Marker = (props: any) => null;
export const Polyline = (props: any) => null;
export const CachedUrlTile = (props: any) => null;
export const Circle = (props: any) => null;

const MapView = forwardRef(({ style }: any, ref) => {
  return (
    <View style={[style, styles.webPlaceholder]}>
       <Image 
          source={{ uri: 'https://placehold.co/800x800/EAECEE/002147?font=roboto&text=Map+Preview%0A(Use+Mobile+App+for+Full+Interactivity)' }}
          style={StyleSheet.absoluteFillObject}
        />
    </View>
  );
});

const styles = StyleSheet.create({
  webPlaceholder: {
    backgroundColor: '#EAECEE',
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default MapView;
MapView.displayName = 'MapView';
