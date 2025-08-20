import PropTypes from "prop-types";
import React from "react";
import styles from "./ParsingDebugDisplay.module.css";

const ParsingDebugDisplay = ({ processedRjBuild, errorContext }) => {
    return (
        <div className={styles.container}>
            <h1>Parsing error</h1>
            <p className={styles.subtitle}>
                The {processedRjBuild.format} content could not be parsed.
            </p>
            <p className={styles.errorDetailsTitle}>Error details:</p>
            <pre className={styles.errorDetails}>{processedRjBuild.error.message}</pre>
            {errorContext && (
                <>
                    <p className={styles.errorDetailsTitle}>Error context:</p>
                    <pre className={styles.errorDetails}>{JSON.stringify(errorContext, null, 2)}</pre>
                </>
            )}
        </div>
    );
};

ParsingDebugDisplay.propTypes = {
    processedRjBuild: PropTypes.shape({
        format: PropTypes.string.isRequired,
        error: PropTypes.shape({
            message: PropTypes.string.isRequired,
        }).isRequired,
    }).isRequired,
    errorContext: PropTypes.object,
};

export default ParsingDebugDisplay;
