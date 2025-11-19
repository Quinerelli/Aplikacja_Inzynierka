// src/pages/Chores/ChoresQuestView.jsx
import React from "react";
import "../../styles/Chores.css";

export default function ChoresQuestView() {
    return (
        <div className="quest-container">
            <h1 className="quest-title">Weekly Quest Board</h1>
            <p className="quest-sub">Your missions for this week!</p>

            <div className="quest-grid">
                <div className="quest-column">
                    <h2 className="quest-col-title">📜 Available Quests</h2>

                    <div className="quest-card">
                        <div className="quest-card-left">
                            <div className="quest-img-placeholder" />
                        </div>
                        <div className="quest-card-right">
                            <div className="quest-name">Clean Your Room</div>
                            <div className="quest-desc">Tidy up your toys and make your bed.</div>
                            <div className="quest-reward">⭐ 25 <span className="money">$2.00</span></div>
                        </div>
                    </div>
                </div>

                <div className="quest-column">
                    <h2 className="quest-col-title green">✔ Quests Completed!</h2>

                    <div className="quest-card completed">
                        <div className="quest-card-left">
                            <div className="quest-img-placeholder" />
                        </div>
                        <div className="quest-card-right">
                            <div className="quest-name">Water the Plants</div>
                            <div className="quest-desc">Give the flowers on the balcony water.</div>
                            <div className="quest-reward">⭐ 20</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
