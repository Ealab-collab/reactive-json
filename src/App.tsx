import {BrowserRouter, Route, Routes} from "react-router-dom";
import {Page} from "./Page.tsx";

// This demo website uses react-bootstrap.
// Don't import this CSS file if you want to use your own CSS library / styled components.
//import "bootstrap/dist/css/bootstrap.min.css";

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
