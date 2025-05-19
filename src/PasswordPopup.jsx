
import { useState } from "react";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import "./PasswordPopup.css";

function PasswordPopup() {
    const [showPassword, setShowPassword] = useState(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOpen, setIsOpen] = useState(true);

    const handleYes = () => {
        setShowPassword(true);
    }

    const handleNo = () => {
        resetAndClose();
    }

    const resetAndClose = () => {
        setShowPassword(false);
        setPassword("");
        setError("");
        setIsOpen(false);
    }
    
    const handleSubmit = async (e) => {
        
        setError("");
        setIsSubmitting(true);

        await new Promise((resolve) => setTimeout(resolve, 2000));

        setIsSubmitting(false);
        resetAndClose();
        alert("Password submitted: " + password);
    }

    return(
        <>
            {/* <button onClick={() => setIsOpen(true)}>Show Password Prompt</button>
            <Dialog open={isOpen} onClose={resetAndClose} className="dialog-overlay">
                <div className="dialog-backdrop"/>
                <div className="dialog-container">
                    <DialogPanel className="dialog-panel">
                        {showPassword ? (
                            <>
                                <DialogTitle className="dialog-title"> Enter Password? </DialogTitle>
                                <p> Would you like to input a password? </p>
                                <div className="dialog-actions">
                                    <button onClick={handleNo} className="btn">
                                        No
                                    </button>
                                    <button onClick={handleYes} className="btn btn-primary">
                                        Yes
                                    </button>
                                </div>
                            </>
                        ) : (
                        <>
                            <DialogTitle className="dialog-title">
                                Enter Password
                            </DialogTitle>
                            <input type="text" placeholder="Enter password" value={password} 
                                onChange={(e) => setPassword(e.target.value)} className="input"/>
                            {error && <p className="error">{error}</p>}

                            <div className="dialog-actions">
                                <button onClick={resetAndClose} className="btn">
                                    Cancel
                                </button>
                                <button onClick={handleSubmit} disabled={isSubmitting} className="btn btn-primary">
                                    {isSubmitting ? "Submitting..." : "Submit"}
                                </button>
                            </div>
                        </>
                        )}
                    </DialogPanel>
                </div>
            </Dialog> */}
            <Transition show={isOpen}>
                <Dialog onClose={() => resetAndClose} className="dialog-overlay">
                    <TransitionChild enter="fade-in" enterFrom="opacity-0" enterTo="opacity-100" 
                        leave="fade-out" leaveFrom="opacity-100" leaveTo="opacity-0">
                        
                        <div className="dialog-backdrop" />
                    </TransitionChild>

                    <div className="dialog-container">
                        <TransitionChild enter="fade-in" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                            leave="fade-out" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                            <DialogPanel className="dialog-panel">
                                {!showPassword ? (
                                    <>
                                        <DialogTitle className="dialog-title"> Enter Password? </DialogTitle>
                                        <p> Would you like to input a password? </p>
                                        <div className="dialog-actions">
                                            <button onClick={handleNo} className="btn">
                                                No
                                            </button>
                                            <button onClick={handleYes} className="btn btn-primary">
                                                Yes
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                <>
                                    <DialogTitle className="dialog-title">
                                        Enter Password
                                    </DialogTitle>
                                    <input type="text" placeholder="Enter password" value={password} 
                                        onChange={(e) => setPassword(e.target.value)} className="input"/>
                                    {error && <p>{error}</p>}

                                    <div className="dialog-actions">
                                        <button onClick={resetAndClose} className="btn">
                                            Cancel
                                        </button>
                                        <button onClick={handleSubmit} disabled={isSubmitting} className="btn btn-primary">
                                            {isSubmitting ? "Submitting..." : "Submit"}
                                        </button>
                                    </div>
                                </>
                                )}
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </Dialog>
            </Transition>
        </>
    );
}

export default PasswordPopup;