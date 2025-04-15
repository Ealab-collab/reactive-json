import {BrowserRouter, Route, Routes} from "react-router-dom";
import Page from "./Page.jsx";

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
                        <Route path={"charts"}
                            element={<Page buildSourcePath={"/rjs-build/charts.yaml"}/>}/>
                    </Route>
                    <Route path={"/src/rjs-build"}>

                    </Route>
                </Routes>
            </BrowserRouter>
        </>
    )
}

export default App
