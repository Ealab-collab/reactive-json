import {Col, Row} from "react-bootstrap";
import Layout from "./Layout.jsx";
import {ReactiveJsonRoot} from "../lib/main.jsx";

function Page({buildSourcePath, dataFetchMethod}) {
    const filePath = buildSourcePath ?? new URL(window.location).searchParams.get("file_path") ?? "/rjs-build/home.yaml";
    const debugMode = new URL(window.location).searchParams.get("debug") ?? true;

    const additionalProps = {};

    additionalProps.DebugModeContentWrapper = ({children}) => {
        return <Col xs={9}>{children}</Col>;
    };

    additionalProps.DebugModeDataWrapper = ({children}) => {
        return <Col xs={3}>
            <pre>{children}</pre>
        </Col>;
    }

    additionalProps.DebugModeRootWrapper = ({children}) => {
        return <Layout><Row>{children}</Row></Layout>
    };

    return <ReactiveJsonRoot dataFetchMethod={dataFetchMethod} dataUrl={filePath} debugMode={debugMode} {...additionalProps}/>;
}

export default Page;
