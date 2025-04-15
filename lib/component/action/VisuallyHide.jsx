/**
 * Action which will render the children, but hide it using a wrapping div.
 *
 * This action is used when the element to hide must still be present in the DOM
 * to respond to events.
 *
 * @param {{}} props
 * @returns {JSX.Element}
 * @constructor
 */
const VisuallyHide = (props) => {
    return <visually-hidden style={{"display": "none"}}>{props.children}</visually-hidden>;
};

export default VisuallyHide;
