import {Dispatch, SetStateAction} from "react";
import {useStateStorage} from "./useStateStorage";

// TODO - initialState should be value | function returning T, and the function should be called in function "initialStateFunction"
export function useStateSession<T>(key: string, initialState: T): [T, Dispatch<SetStateAction<T>>] {

    return useStateStorage<T>("session", key, initialState);
}
