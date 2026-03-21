import { LoadScript } from '@react-google-maps/api';
import { ReactNode } from 'react';

const GOOGLE_MAPS_API_KEY = 'AIzaSyAmcQFVJEnMMWyDHfKjGuDxEvxn9o6kpt4';
const LIBRARIES: ('drawing' | 'places')[] = ['drawing'];

interface Props {
  children: ReactNode;
}

export default function GoogleMapsProvider({ children }: Props) {
  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={LIBRARIES}>
      {children}
    </LoadScript>
  );
}
