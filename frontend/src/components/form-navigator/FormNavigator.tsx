import React, {Component, type ReactElement, type RefObject, createRef, cloneElement} from "react";
import {FormBase} from "../form";

// helper
interface FormElement {
    elem: ReactElement;
    xElemRef: RefObject<unknown>;
}

export interface FormNavigatorProps {
    rootFormElement?: ReactElement;
}

/**
 * @deprecated use opening form in dialogs instead
 */
export class FormNavigator extends Component<FormNavigatorProps> {

    // formElements after rootFormElement
    state: {formElements: FormElement[];};

    // not nice but but I want to avoid deep refactoring...
    xRootElemRef: RefObject<unknown>;

    constructor(props: FormNavigatorProps) {
        super(props);
        this.state = {
            formElements: []
        };

        this.xRootElemRef = createRef();

        this.openForm = this.openForm.bind(this);
    }

    openForm(newFormElement: ReactElement | null): void {
        //console.log("called FormNavigator.openForm");
        //console.log(newFormElement);

        // we always need to create a new object and set that into the state, if we only add an element into the array, react does not trigger a render!
        // shallow copy cloning (a copy of the references is created)
        const formElementsCloned: FormElement[] = this.state.formElements.slice();

        if (newFormElement !== null) {
            formElementsCloned.push({elem: newFormElement, xElemRef: createRef()});
        }
        else {
            // the user pressed cancel/back - we return to the previous form
            // we drop the last element
            if (formElementsCloned.length > 0) {
                formElementsCloned.pop();
            }
            else {
                console.log("neocakavana chyba - pole formElements je prazdne");
            }
        }

        this.setState({formElements: formElementsCloned}, () => {
            // when on mobile we click through between forms, the browser keeps the scrolled position but we want to return to the start of the page
            // (this callback is called after the page is refreshed)

            // something like this did not work, I don't know why...
            // setTimeout(function() {
            //     window.scrollTo(0,0);
            // }, 100);

            // so we scroll to the menu, which is in the upper part
            const menuElem = document.getElementById("menuId")
            if (menuElem !== null) {
                menuElem.scrollIntoView();
            }
        });
    }

    // API function - returns false if cancel was stopped (not confirmed) by user
    cancelFormEdit(): boolean {
        const formElements: FormElement[] = this.getAllFormElements();
        // slice makes a copy
        for (const formElement of formElements.slice().reverse()) {
            if (this.isFormBase(formElement.elem)) {
                if (!((formElement.xElemRef as RefObject<FormBase>).current!.cancelEdit())) {
                    return false;
                }
            }
        }
        return true;
    }

    isFormBase(elem: ReactElement): boolean {
        const type = elem.type;

        // only class components have prototype.isReactComponent
        return (
            typeof type === "function" &&
            type.prototype &&
            type.prototype.isReactComponent &&
            type.prototype instanceof FormBase);
    }

    // helper returning all elems including root elem
    getAllFormElements(): FormElement[] {
        // rootFormElement can be undefined at the start of app (no form displayed)
        return this.props.rootFormElement ? [{elem: this.props.rootFormElement, xElemRef: this.xRootElemRef}, ...this.state.formElements] : this.state.formElements;
    }

    render() {
        const formElements: FormElement[] = this.getAllFormElements();
        const forms = formElements.map((formElement, index) => {
                const displayed: boolean = (index === formElements.length - 1);
                // by cloning the element we add the attribute openForm={this.openForm} (we don't have to add this attribute when creating the element)
                const formElementCloned = cloneElement(formElement.elem as ReactElement<any>, {ref: formElement.xElemRef, openForm: this.openForm, displayed: displayed}/*, (formElement as any).children*/);
                // we hide the first n - 1 components via display: "none" and only the last one we really render (via display: "block")
                // TODO - for the future - if we don't want to keep the component state via display: "none", it is enough to return null (we don't render the component at all)
                const display: string = (displayed ? "block" : "none");
                // TODO - I don't know for sure whether key={index} is needed
                // max-width: 100% - because of a bug when on mobile the left part of the table/form was not displayed (it was not possible to scroll to it)
                // note2: this problem occurred in connection with flex-direction: column on .App-form - we removed that and therefore we remove maxWidth (for now)
                return <div key={index} style={{display: display /*, maxWidth: "100%"*/}}>{formElementCloned}</div>;
            }
        );
        return (
            <div className="App-form">
                {forms}
            </div>
        );
    }
}
