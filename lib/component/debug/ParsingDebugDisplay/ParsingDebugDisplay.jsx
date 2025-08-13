import React from "react";
import styles from "./ParsingDebugDisplay.module.css";
import PropTypes from "prop-types";

const ParsingDebugDisplay = ({ processedRjBuild }) => {
    return (
        <div className={styles.container}>
            <h1>Parsing error</h1>
            <p className={styles.subtitle}>
                The {processedRjBuild.format} content could not be parsed.
            </p>
            <p className={styles.errorDetailsTitle}>Error details:</p>
            <p
                className={styles.errorDetails}
                dangerouslySetInnerHTML={{
                    __html: processedRjBuild.error.message.replace(
                        "\n",
                        "<br />"
                    ),
                }}
            />
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
};

export default ParsingDebugDisplay;
