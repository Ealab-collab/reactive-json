import reactiveJsonLogo from './assets/react.svg';
import React from 'react';
import {Navbar, Nav, Container} from "react-bootstrap";

const Layout = ({children}) => {
    return (
        <>
            <Navbar bg="light" expand="lg">
                <Navbar.Brand href="/"><img src={reactiveJsonLogo} className="logo react" alt="Reactive-JSON logo"/> reactive-json demo</Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav"/>
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="mr-auto">
                        <Nav.Link href="/">Home</Nav.Link>
                        <Nav.Link href="/demo">Demo</Nav.Link>
                        <Nav.Link href="/charts">Charts</Nav.Link>
                    </Nav>
                </Navbar.Collapse>
            </Navbar>
            <Container>
                {children}
            </Container>
        </>
    );
};

export default Layout;
