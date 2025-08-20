import styles from "./DebugJson.module.css";

const DebugJson = ({ jsonString }) => {
    return <pre className={styles.container}>{jsonString}</pre>;
};

export default DebugJson;
