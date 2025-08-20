import styles from "./DebugList.module.css";

const DebugList = ({ flatRows }) => {
    return (
        <div className={styles.container}>
            {flatRows.map((row) => (
                <div key={row.path} className={styles.row}>
                    <span className={styles.path}>{row.path}</span>
                    <span>:</span>
                    <span className={styles.value}>{JSON.stringify(row.value)}</span>
                </div>
            ))}
        </div>
    );
};

export default DebugList;
