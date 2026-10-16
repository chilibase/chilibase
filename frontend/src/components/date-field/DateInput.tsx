import React, {useState, type FocusEvent} from "react";
import {Calendar, type CalendarSelectEvent} from "primereact/calendar";
import {dateAsUI, dateFormatCalendar, dateFromModel, dateFromUI, DateScale} from "../../common/UtilsConversions";
import {Utils} from "../../utils/Utils";
import type {FormEvent} from "primereact/ts-helpers";

// wrapper for Calendar component
// TODO - datetime mode for writing does not work - implement the conversion!

export interface DateInputProps {
    id?: string;
    value: Date | null;
    onChange: (value: Date | null) => void;
    readOnly?: boolean;
    error?: string; // error message, if we want to mark the field as invalid
    scale?: DateScale;
    datetime?: boolean;
}

export const DateInput = (
    {
        scale = DateScale.Date,
        datetime = false,
        ...propsRest
    }
    : DateInputProps) => {
    const props = {
        scale,
        datetime,
        ...propsRest
    }

    // true if the user is typing a value
    // false if the user has finished typing (onBlur was called) - we take the value "from above" (from prop.value)
    const [inputChanged, setInputChanged] = useState<boolean>(false);
    // used only if inputChanged === true; the changed value in the input is stored here
    const [inputValueState, setInputValueState] = useState<string | undefined>(undefined);

    const onChange = (e: FormEvent<Date>) => {
        // normally e.value comes from Calendar - type Date or null
        // type Date comes if the user filled in a valid date, null (typeof e.value returns "object") comes if the user deleted the date
        // or the date is still incomplete (the user is just entering the date)
        // we set keepInvalid={true} -> an invalid string will come (typeof e.value returns "string")
        // in addition we turned off parsing to a date (method parseDateTime), so "string" always comes and we do the conversion in onBlur

        setInputChanged(true);
        setInputValueState(e.value as any); // always a string
    }

    const onSelect = (e: CalendarSelectEvent) => {
        // we must call props.onChange here because the select event also calls onChange but we deliberately do not call props.onChange in onChange
        // (we wait for the blur event, which does not come after select)
        //props.onChange(e.value as any); // always Date
        // <- it used to be like this but it created Tue Feb 04 2025 00:00:00 GMT+0100 (Central European Standard Time) and via onBlur (and when a string came from the DB)
        //               it created Tue Feb 04 2025 01:00:00 GMT+0100 (Central European Standard Time)
        //               and then XUtilsCommon.dateEquals did not work (via date1.getTime() === date2.getTime())
        // so that onSelect and onBlur are consistent, we do:
        const value: Date | null | undefined = dateFromUI(dateAsUI(e.value as any, scale), scale); // e.value is always Date
        props.onChange(value ?? null);

        // for the sake of order we reset the state
        setInputChanged(false);
        setInputValueState(undefined);
    }

    const onBlur = (e: FocusEvent<HTMLInputElement>) => {
        if (inputChanged) {
            // note: e.target.value and inputValueState contain the same string value
            const value: Date | null | undefined = dateFromUI(e.target.value, scale);
            props.onChange(value ?? null); // an incorrect value represented by undefined we will handle as if the user entered null (the field is cleared)
            setInputChanged(false);
            setInputValueState(undefined); // for the sake of order
        }
    }

    const getInputValue = (): any => {
        let inputValue: any;
        if (inputChanged) {
            inputValue = inputValueState!; // always a string
        }
        else {
            inputValue = dateFromModel(props.value);
        }
        return inputValue;
    }

    const getView = (dateScale: DateScale): "date" | "month" | "year" => {
        let view: "date" | "month" | "year";
        if (dateScale === DateScale.Date) {
            view = "date";
        }
        else if (dateScale === DateScale.Month) {
            view = "month";
        }
        else if (dateScale === DateScale.Year) {
            view = "year";
        }
        else {
            throw "Unimplemented dateScale = " + dateScale;
        }
        return view;
    }

    // note: parseDateTime does not do any parse, we do not want Calendar to "disturb" the user while typing the date
    // the conversion (and the call of props.onChange) is done only on onBlur
    return (
        <Calendar id={props.id} value={getInputValue()} onChange={onChange} disabled={props.readOnly} showIcon={true} showOnFocus={false}
                  view={getView(scale)} dateFormat={dateFormatCalendar(scale)} keepInvalid={true} parseDateTime={(text: string) => text as any}
                  showTime={props.datetime} showSeconds={props.datetime} inputClassName={props.datetime ? 'x-input-datetime' : 'x-input-date'}
                  onSelect={onSelect} onBlur={onBlur} {...Utils.createTooltipOrErrorProps(props.error)}/>
    );
}

