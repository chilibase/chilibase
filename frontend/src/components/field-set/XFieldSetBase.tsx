import type {ReactElement} from "react";
import {numberAsUI, numberFromModel} from "../../common/UtilsConversions";

// the whole XFieldSetBase will come here in the future, for now only some types are copied here

// corresponds to the entity XFieldSetMeta
export interface XFieldSetMeta {
    id?: number;
    fieldSetId: string; // the field set will be referenced in the code through this id
    //table: string;
    xFieldMetaRoot: XFieldMeta; // root field (cannot be deleted)
    modifDate: Date | null;
    modifUser: any | null;
    version: number;
}

export enum XFieldType {
    rootField = "rootField", // special root field
    fieldGroup = "fieldGroup", // contains a group of fields, has no DB column (non-persistent)
    fieldGroupWithCheckbox = "fieldGroupWithCheckbox", // contains a group of fields, the group is displayed if the checkbox is checked
    checkbox = "checkbox", // classic two-state checkbox
    checkboxNullable = "checkboxNullable", // three-state checkbox true/false/null
    inputText = "inputText",
    inputDecimal = "inputDecimal"
}

// children layout can be set only on a type that has children - rootField, fieldGroup
export enum XChildrenLayout {
    column = "column",  // default - renders children into a column
    row = "row",        // renders children into a row
    tabView = "tabView", // makes sense if children are of type fieldGroup (labels of these children fieldGroups will be used as labels of the individual tabs)
    tabViewWithHeaderGroup = "tabViewWithHeaderGroup" // the same as tabView but the first fieldGroup (0-th tab) is displayed above the tabView (so that it is always accessible)
}
// note - tabView and tabViewWithHeaderGroup ignore ordinary simple children - if such exist, a warning is shown to the user when setting tabView

// we will use only the checkbox supressFieldGroupPanel
// used only for type fieldGroup and only in the case when the given fieldGroup is not rendered in some tab (its parent has layout tabView* set)
// export enum XFieldGroupPanelViewStatus {
//     show = "show",  // default - renders the Panel together with the label and places children inside the panel
//     hide = "hide"   // does not render the Panel, places children into a div element (the label is not used) - used to create columns in the (parent) fieldGroup
// }

export enum XFieldPropValuesFrom {
    parent = "parent",  // we take field prop values from the parent
    this = "this"       // we take field prop values from the current field
}

export interface XFieldMeta {
    type?: XFieldType;
    childrenLayout?: XChildrenLayout; // used only on a type that has children - rootField, fieldGroup (the default value is "column")
    width?: string; // value e.g. 10rem, used mainly if childrenLayout = column
    labelWidth?: string; // value e.g. 6rem, used (for now) only for type = inputText (the default set via css is 100% - it causes shifting/aligning the input to the right)
    inputWidth?: string; // value e.g. 4rem, used (for now) only for type = inputText
    suppressFieldGroupPanel?: true; // used only for type fieldGroup and only in the case when the given fieldGroup is not rendered in some tab (its parent has layout tabView* set)
                                    // if true then it does not render the Panel, it places children into a div element (the label is not used) - used to create columns in the (parent) fieldGroup
    field: string; // used in the code and at the same time it is the column name - e.g. obciansky_preukaz
    label: string; // used in the form as the label
    tooltip?: string; // used in the form as the tooltip
    decimalProps?: {scale: number;}; // used for inputDecimal (scale = number of decimal places), maybe in the future we will add precision (number of digits including scale) and useGrouping
    //notNull: boolean; // default false, notNull can be only those columns that are always filled (either they have defaultValue filled or they are always visible (they don't have dateFrom/dateTo filled))
    //defaultValue: String; // this is a problem, we have to write it here in the UI format!
    dateFrom?: Date;
    dateTo?: Date;
    xFieldMetaList?: XFieldMeta[];
    fieldPropValuesMapForEdit?: XFieldPropValuesMapForEdit; // if we use the parameter "fieldProps", the values clicked in XEditFieldDialog are stored here
    fieldPropValuesMapCached?: XFieldPropValuesMap; // the same as fieldPropValuesMapForEdit but a possible valuesFrom === parent is also taken into account, it is not saved into the DB, it is computed after loading from the DB
    xFieldMetaParentCached?: XFieldMeta; // helper attribute so that we simplify the code and don't have to push a parameter with the parent everywhere, it is not saved into the DB, it is computed after loading from the DB
}

export interface XFieldPropValuesMapForEdit {
    [field: string]: XFieldPropValuesForEdit; // the id is XFieldProp.id
}

export interface XFieldPropValuesMap {
    [field: string]: XFieldPropValues; // the id is XFieldProp.id
}

export interface XFieldPropValuesForEdit {
    valuesFrom: XFieldPropValuesFrom; // value of the dropdown "Values from"
    values?: XFieldPropValues; // if valuesFrom = "this" then the clicked items are here, otherwise undefined is here (without the attribute values)
    error?: string; // special attribute where we store the error from autocomplete (used only during editing (after editing ends it is always undefined))
}

// the exact type is determined by the used <Name>FieldPropEdit - boolean, number, object can be here
export type XFieldPropValues = any | undefined;

// data structure for creating specific application attributes entered in XEditFieldDialog
// an array of instances of this structure comes as the parameter fieldProps into the component XFieldSet
export interface XFieldProp {
    id: string;
    label: string;
    fieldPropEdit?: ReactElement; // fieldPropEdit is a component for editing fieldProp, it has props of type XFieldPropEditProps
}

// special interface (api) for a custom component (called <Name>FieldPropEdit),
// thanks to this interface the custom component is displayed/integrated in XEditFieldDialog,
// which serves for editing a custom property (this property can have an arbitrary structure (object literal))
// (it works similarly to e.g. property searchBrowse in XAutoComplete - a browse component is written into property searchBrowse
// and XAutoComplete uses this browse component)
export interface XFieldPropEditProps {
    value?: XFieldPropValues;
    onChange?: (value: XFieldPropValues) => void;
    onErrorChange?: (error: (string | undefined)) => void;
}

// data structure into which we write field values (the structure is written into the DB into the column <jsonField>)
export interface XFieldSetValues {
    [field: string]: any;
}

// map used for fast lookup of XFieldMeta (mainly when rendering the clickable controls in the browse)
export type XFieldXFieldMetaMap = Map<string, XFieldMeta>;

// for now provisionally only for static methods
export class XFieldSetBase {

    // api method for creating a Map instance, which serves for quickly finding the corresponding XFieldMeta by the field name
    // if filterFromParent is given, it returns only children/subchildren/... of the field with field = filterFromParent
    // (filterFromParent is often a groupField)
    static createXFieldXFieldMetaMap(xFieldSetMeta: XFieldSetMeta, filterFromParent?: string): XFieldXFieldMetaMap {

        const xFieldXFieldMetaMap: XFieldXFieldMetaMap = new Map<string, XFieldMeta>();
        XFieldSetBase.createMapForXFieldMeta(xFieldSetMeta.xFieldMetaRoot, filterFromParent, xFieldXFieldMetaMap);
        return xFieldXFieldMetaMap;
    }

    // api method for rendering a field set attribute
    // logically it belongs into src/common/XUtilsConversions.ts and it would also be useful when exporting to excel but we have XFieldXFieldMetaMap (and its "parent" XFieldSetBase) only on the frontend
    static xFieldSetValuesAsUI(xFieldSetValues: XFieldSetValues, xFieldXFieldMetaMap: XFieldXFieldMetaMap): string {
        // will we always have the correct order? we won't... probably the simplest is to sort "valueUIList" alphabetically here
        const valueUIList: string[] = [];
        for (const [field, value] of Object.entries(xFieldSetValues)) {
            const xFieldMeta: XFieldMeta | undefined = xFieldXFieldMetaMap.get(field);
            if (xFieldMeta) {
                valueUIList.push(XFieldSetBase.xFieldSetValueAsUI(xFieldMeta, value));
            }
            else {
                // the field was removed from the form (it should not be used this way, rather the validity of the field should be bounded by a date)
                // we display it in the raw state
                valueUIList.push(`${field}: ${typeof value === 'string' ? '"' + value + '"' : value}`);
            }
        }
        return valueUIList.join(", ");
    }

    static xFieldSetValueAsUI(xFieldMeta: XFieldMeta, value: any): string {
        let valueAsUI: string;
        if (xFieldMeta.type === XFieldType.checkbox) {
            valueAsUI = xFieldMeta.label;
        }
        else if (xFieldMeta.type === XFieldType.inputText) {
            valueAsUI = `${xFieldMeta.label}: "${value}"`;
        }
        else if (xFieldMeta.type === XFieldType.inputDecimal) {
            valueAsUI = `${xFieldMeta.label}: ${numberAsUI(numberFromModel(value), xFieldMeta.decimalProps?.scale)}`;
        }
        else {
            // unknown type
            valueAsUI = `${xFieldMeta.label}: "${value}"`;
        }
        return valueAsUI;
    }

    private static createMapForXFieldMeta(xFieldMeta: XFieldMeta, filterFromParent: string | undefined, xFieldXFieldMetaMap: XFieldXFieldMetaMap) {

        if (filterFromParent === undefined) {
            // no filter is used
            xFieldXFieldMetaMap.set(xFieldMeta.field, xFieldMeta);
        }
        else if (filterFromParent === xFieldMeta.field) {
            // the searched parent field has been found, all his children/subchildren/... will be added to the list (we remove the filter)
            filterFromParent = undefined;
        }

        if (xFieldMeta.xFieldMetaList) {
            for (const insideXFieldMeta of xFieldMeta.xFieldMetaList) {
                XFieldSetBase.createMapForXFieldMeta(insideXFieldMeta, filterFromParent, xFieldXFieldMetaMap);
            }
        }
    }
}