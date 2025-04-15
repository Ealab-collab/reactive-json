/**
 * Action which will not render the children.
 *
 * This will also cancel any subsequent actions.
 * 
 * @returns {null}
 * @constructor
 */
const Hide = () => {
    // Simply don't render the children.
    return null;
};

export default Hide;
