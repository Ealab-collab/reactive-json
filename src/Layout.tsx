import reactiveJsonLogo from "./assets/react.svg";
import styles from "./Layout.module.css";

export const Layout = ({ children }) => {
    return (
        <>
            <nav className={styles.navbar}>
                <a href="/" className={styles.navbarBrand}>
                    <img
                        src={reactiveJsonLogo}
                        className={styles.logo}
                        alt="Reactive-JSON logo"
                    />
                    reactive-json demo
                </a>
                <ul className={styles.navbarNav}>
                    <li>
                        <a href="/" className={styles.navLink}>Home</a>
                    </li>
                    <li>
                        <a href="/demo" className={styles.navLink}>Demo</a>
                    </li>
                </ul>
            </nav>
            <div className={styles.container}>
                {children}
            </div>
        </>
    );
};
