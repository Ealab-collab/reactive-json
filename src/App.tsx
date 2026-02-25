import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Page } from "./Page.tsx";
import { PageExperimental } from "./PageExperimental.tsx";

function App() {
    return (
        <>
            <BrowserRouter>
                <Routes>
                    <Route path={"/"}>
                        <Route index element={<Page />} />
                        <Route path={"demo"} element={<Page buildSourcePath={"/rjs-build/demo.yaml"} />} />
                        <Route path={"experimental"} element={<PageExperimental />} />
                    </Route>
                    <Route path={"/src-web/rjs-build"}></Route>
                </Routes>
            </BrowserRouter>
        </>
    );
}

export default App;
