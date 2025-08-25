import {BrowserRouter, Route, Routes} from "react-router-dom";
import {Page} from "./Page.tsx";

function App() {
    return (
        <>
            <BrowserRouter>
                <Routes>
                    <Route path={"/"}>
                        <Route index
                            element={<Page/>}/>
                        <Route path={"demo"}
                            element={<Page buildSourcePath={"/rjs-build/demo.yaml"}/>}/>
                    </Route>
                    <Route path={"/src-web/rjs-build"}>

                    </Route>
                </Routes>
            </BrowserRouter>
        </>
    )
}

export default App
