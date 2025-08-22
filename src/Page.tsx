import {Layout} from "./Layout.tsx";
import {ReactiveJsonRoot} from "../lib/engine/ReactiveJsonRoot.jsx";
import {stringToBoolean} from "../lib/engine/utility";
import styles from "./Layout.module.css";

export function Page({buildSourcePath, rjBuildFetchMethod}) {
    const filePath = buildSourcePath ?? new URL(window.location).searchParams.get("file_path") ?? "/rjs-build/home.yaml";
    const debugModeRaw = new URL(window.location).searchParams.get("debug");
    const debugMode = debugModeRaw === null ? true : stringToBoolean(debugModeRaw);

    const additionalProps = {
        DebugModeContentWrapper: ({children}) => {
            return <div className={styles.col9}>{children}</div>;
        },
        DebugModeDataWrapper: ({children}) => {
            return <div className={`${styles.col3} ${styles.debugData}`}>
                <pre>{children}</pre>
            </div>;
        },
        DebugModeRootWrapper: ({children}) => {
            return <Layout><div className={styles.row}>{children}</div></Layout>
        },
    };

    return <ReactiveJsonRoot rjBuildFetchMethod={rjBuildFetchMethod} rjBuildUrl={filePath}
        debugMode={debugMode} {...additionalProps}/>;
}
