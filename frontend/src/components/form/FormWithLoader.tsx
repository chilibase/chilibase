import React from 'react';
import {
    AssocListFunction,
    CreateObjectFunction,
    FormProps,
    FormWithLoaderProps,
    LoadObjectFunction,
} from "./FormBase";
import {OperationType, XUtils} from "../XUtils";
import {Params} from "../../common/UtilsCommon";
import {XEnvVar} from "../XEnvVars";
import {EntityRow} from "../../common/types";

// HOC component - wraps form component (e.g. CarForm - either as component type or as JSX element (with custom props))
// into enhanced component that renders/reads data
// form component has prop loaderData, enhanced component (wrapper) has prop id instead loaderData

// correct types:
// "props: FormProps" - (props of the form component) - must have id (for detecting insert/update) and also must have loaderData (possible enhancement - id could be taken from loaderData)
// "React.FC<FormProps>" (props of the returned enhanced component) - must have id and should omit loaderData (chatGPT suggested type React.FC<Omit<FormParam, 'loaderData'>>)
export function FormWithLoader<T = any>(
    Form: React.ComponentType<FormProps> | undefined,
    formElement: React.ReactElement | undefined,
    entity: string, // entity of the form - better would be to take entity from form (if it is technically possible)
    operationType: OperationType.Insert | OperationType.Update
): React.FC<FormWithLoaderProps> {

    // according to context, we look up some special static function on the form component, and we use the function to load data
    const FormType = Form ?? formElement?.type;
    let createObject: CreateObjectFunction<T> | undefined = undefined;
    let loadObject: LoadObjectFunction<T> | undefined = undefined;
    const legacyObjectLoading: boolean = XUtils.getEnvVarValueBoolean(XEnvVar.VITE_LEGACY_OBJECT_LOADING);
    if (operationType === OperationType.Insert) {
        createObject = (FormType as any).createObject;
        if (!createObject && !legacyObjectLoading) {
            // default createObject function
            createObject = XUtils.getDefaultCreateObject<T>(entity);
        }
    }
    else if (operationType === OperationType.Update) {
        loadObject = (FormType as any).loadObject;
        if (!loadObject) {
            // try method assocList (fieldList is not used for now)
            let assocListFunction: AssocListFunction | undefined = (FormType as any).assocList;
            if (!assocListFunction && !legacyObjectLoading) {
                // default assocList function (returns empty string array - no join to the other entity used)
                assocListFunction = (params?: Params)=> [];
            }
            if (assocListFunction) {
                loadObject = (id: number, params?: Params) => {
                    const assocList: string[] = assocListFunction!(params);
                    return XUtils.fetchById(entity, assocList, id);
                };
            }
        }
    }

    let EnhancedComponent: React.FC<FormWithLoaderProps>;
    if (createObject || loadObject) {
        EnhancedComponent = (props: FormWithLoaderProps) => {
            const [loading, setLoading] = React.useState(true);
            const [error, setError] = React.useState<Error | null>(null);
            const [data, setData] = React.useState<T | undefined>(undefined);

            React.useEffect(() => {
                let cancelled = false;

                setLoading(true);
                let promise: Promise<T>;
                if (createObject) {
                    promise = createObject(props.params);
                }
                else if (loadObject) {
                    promise = loadObject(props.id!, props.params);
                }
                promise!
                    .then((res) => {
                        if (!cancelled) setData(res);
                    })
                    .catch((err) => {
                        if (!cancelled) setError(err);
                    })
                    .finally(() => {
                        if (!cancelled) setLoading(false);
                    });

                return () => {
                    cancelled = true;
                };
            }, [props.id]);

            if (loading) {
                return <div>🔄 Loading...</div>;
            }

            if (error) {
                return <div style={{ color: 'red' }}>❌ Error loading data: {error.message}</div>;
            }

            if (Form) {
                // we use component type (idiomatic way)
                return <Form ref={props.formBaseRef} entityRow={data as EntityRow} id={props.id} initValues={props.initValues} onSaveOrCancel={props.onSaveOrCancel} isInDialog={props.isInDialog} params={props.params}/>;
            }
            else {
                // we use JSX element (not recommended way, but we can pass (custom) props at app level)
                return React.cloneElement(formElement!, {
                    ref: props.formBaseRef,
                    entityRow: data as EntityRow,
                    id: props.id,
                    initValues: props.initValues,
                    onSaveOrCancel: props.onSaveOrCancel,
                    isInDialog: props.isInDialog,
                    params: props.params
                } satisfies FormProps);
            }
        };
    }
    else {
        // simple EnhancedComponent without loading
        EnhancedComponent = (props: FormWithLoaderProps) => {
            if (Form) {
                // we use component type (idiomatic way)
                return <Form ref={props.formBaseRef} entityRow={undefined} id={props.id} onSaveOrCancel={props.onSaveOrCancel} isInDialog={props.isInDialog} params={props.params}/>;
            }
            else {
                // we use JSX element (not recommended way, but we can pass (custom) props at app level)
                return React.cloneElement(formElement!, {
                    ref: props.formBaseRef,
                    entityRow: undefined,
                    id: props.id,
                    onSaveOrCancel: props.onSaveOrCancel,
                    isInDialog: props.isInDialog,
                    params: props.params
                } satisfies FormProps);
            }
        };
    }

    return EnhancedComponent;
}

