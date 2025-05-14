import {Col, Row} from "react-bootstrap";
import {Layout} from "./Layout.tsx";
import {ReactiveJsonRoot} from "../lib/engine/ReactiveJsonRoot.jsx";
import {stringToBoolean} from "../lib/engine/utility/stringToBoolean.jsx";

export function Page({buildSourcePath, dataFetchMethod}) {
    const filePath = buildSourcePath ?? new URL(window.location).searchParams.get("file_path") ?? "/rjs-build/home.yaml";
    const debugModeRaw = new URL(window.location).searchParams.get("debug");
    const debugMode = debugModeRaw === null ? true : stringToBoolean(debugModeRaw);

    const additionalProps = {
        DebugModeContentWrapper: ({children}) => {
            return <Col xs={9}>{children}</Col>;
        },
        DebugModeDataWrapper: ({children}) => {
            return <Col xs={3}>
                <pre>{children}</pre>
            </Col>;
        },
        DebugModeRootWrapper: ({children}) => {
            return <Layout><Row>{children}</Row></Layout>
        },
    };

    return <ReactiveJsonRoot dataFetchMethod={dataFetchMethod} dataUrl={filePath}
        debugMode={debugMode} {...additionalProps}/>;
}
