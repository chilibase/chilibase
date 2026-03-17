import {Dispatch, SetStateAction} from "react";
import {useStateStorage} from "./useStateStorage";

// TODO - initialState should be value | function returning T, and the function should be called in function "initialStateFunction"
export function useStateLocal<T>(key: string, initialState: T): [T, Dispatch<SetStateAction<T>>] {

    return useStateStorage<T>("local", key, initialState);
}
