import {Dispatch, SetStateAction} from "react";
import {StorageType} from "../../utils/types";
import {Utils} from "../../utils/Utils";
import {useStateStorageBase} from "./useStateStorageBase";

// TODO - initialState should be value | function returning T, and the function should be called in function "initialStateFunction"
export function useStateStorage<T>(xStorageType: StorageType, key: string, initialState: T): [T, Dispatch<SetStateAction<T>>] {

    return useStateStorageBase(xStorageType, key, () => Utils.getValueFromStorage(xStorageType, key, initialState));
}
