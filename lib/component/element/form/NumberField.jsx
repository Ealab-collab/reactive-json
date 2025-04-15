import React, {useContext, useState} from 'react';
import Form from 'react-bootstrap/Form';
import GlobalDataContext from "../../../engine/GlobalDataContext";

const NumberField = ({props, currentData, datafield, path}) => {
    const globalDataContext = useContext(GlobalDataContext);

    let [inputValue] = useState(currentData);

    let attributes = props.attributes ?? {};

    const {updateData} = globalDataContext;

    const changeValue = (e) => {
        updateData(e.currentTarget.value, path);
    }

    return (
        <Form.Group className="mb-3" controlId={Math.random().toString()}>
            <Form.Label>{props.label}</Form.Label>
            <Form.Control onBlur={changeValue} type={"number"} {...attributes}
                          defaultValue={inputValue !== "" ? inputValue : (props.default_value ?? "")}
                          placeholder={props.label}/>

        </Form.Group>
    )
}

export default NumberField;