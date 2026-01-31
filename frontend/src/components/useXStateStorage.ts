import {Dispatch, SetStateAction} from "react";
import {StorageType} from "../utils/types";
import {Utils} from "../utils/Utils";
import {useXStateStorageBase} from "./useXStateStorageBase";

// TODO - initialState sholud be value | function returning T, and the function should be called in function "initialStateFunction"
export function useXStateStorage<T>(xStorageType: StorageType, key: string, initialState: T): [T, Dispatch<SetStateAction<T>>] {

    return useXStateStorageBase(xStorageType, key, () => Utils.getValueFromStorage(xStorageType, key, initialState));
}
