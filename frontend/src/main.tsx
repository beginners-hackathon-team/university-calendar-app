import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import APP from "./APP";

createRoot(document.getElementById('root')!).render(
 <StrictMode>
    <BrowserRouter>
       <APP />
    </BrowserRouter>
 </StrictMode>
)