// src/pages/index.js
import { useEffect, useState } from "react";
import Head from 'next/head';
import { useSession, signIn, signOut } from "next-auth/react";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import RegistrationModal from "../components/RegistrationModal";

// Hàm phụ trợ để format ngày tháng
const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) {
        return { day: 'N/A', month: 'N/A', full: 'Chưa cập nhật' };
    }
    const date = timestamp.toDate();
    const day = date.getDate();
    const month = `Thg ${date.getMonth() + 1}`;
    const full = date.toLocaleTimeString('vi-VN', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
    });
    return { day, month, full };
};

export default function Home() {
    const { data: session, status } = useSession();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "events"));
                let eventsData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                eventsData.sort((a, b) => (a.eventTime?.toMillis() || Infinity) - (b.eventTime?.toMillis() || Infinity));
                setEvents(eventsData);
            } catch (error) {
                console.error("Firebase Read Error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    const handleRegisterClick = (event) => {
        if (status !== "authenticated") {
            alert("Vui lòng đăng nhập bằng email sinh viên để thực hiện đăng ký.");
            signIn('google');
            return;
        }
        setSelectedEvent(event);
        setIsRegisterModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsRegisterModalOpen(false);
        setSelectedEvent(null);
    };

    return (
        <div className="container">
            <Head>
                <title>Sự kiện Tốt nghiệp - Đại học Cần Thơ</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <header className="hero-banner">
                <img src="/CTU_Logo.png" alt="Logo Đại học Cần Thơ" className="hero-logo" />
                <h1>Hệ thống Đăng ký Sự kiện Lễ Tốt nghiệp</h1>
                
                <div className="header-actions">
                    <div className="schedule-link-container">
                        <a href="/lich-tot-nghiep-toan-truong.png" target="_blank" rel="noopener noreferrer" className="header-action-btn">
                            📅 Lịch tốt nghiệp toàn trường
                        </a>
                    </div>
                    <div className="login-status">
                        {status === "loading" && <p>Đang tải...</p>}
                        {status === "unauthenticated" && (
                            <button className="header-action-btn login-btn" onClick={() => signIn('google')}>
                                Đăng nhập
                            </button>
                        )}
                        {status === "authenticated" && (
                            <div className="user-info">
                                <span>Xin chào, {session.user.name}</span>
                                <button className="header-action-btn logout-btn" onClick={() => signOut()}>
                                    Đăng xuất
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main>
                {loading ? <div className="loader-container"><div className="loader"></div></div> : (
                    <div className="event-grid-detailed">
                        {events.map((event) => {
                            const eventDate = formatDate(event.eventTime);
                            return (
                                <div key={event.id} className="event-card-detailed">
                                    <div className="event-card-image-wrapper">
                                        <img src={event.imageUrl} alt={event.title} className="event-card-image" />
                                        <div className="event-card-date">
                                            <span className="day">{eventDate.day}</span>
                                            <span className="month">{eventDate.month}</span>
                                        </div>
                                    </div>
                                    <div className="event-card-content">
                                        <h3>{event.title}</h3>
                                        <div className="event-info-grid">
                                            {/* Cột trái */}
                                            <div className="info-col">
                                                <p><strong>🏢 Đơn vị:</strong> {event.organizer || 'Chưa cập nhật'}</p>
                                                <p><strong>📍 Địa điểm:</strong> {event.location || 'Chưa cập nhật'}</p>
                                                <p><strong>🗓️ Thời gian:</strong> {eventDate.full}</p>
                                            </div>
                                            {/* Cột phải */}
                                            <div className="info-col">
                                                <p><strong>🕔 Bắt đầu ĐK:</strong> {formatDate(event.startTime).full}</p>
                                                <p><strong>🕔 Hạn chót ĐK:</strong> {formatDate(event.endTime).full}</p>
                                                <p><strong>📊 Số lượng:</strong> {event.registeredCount || 0} / {event.eligibleCount || 'N/A'}</p>
                                            </div>
                                        </div>
                                        {event.notes && <p className="event-notes"><strong>📝 Ghi chú:</strong> {event.notes}</p>}
                                        <div className="event-card-actions">
                                            <button className="register-btn-small" onClick={() => handleRegisterClick(event)}>
                                                Đăng ký
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>
            {isRegisterModalOpen && <RegistrationModal event={selectedEvent} onClose={handleCloseModal} />}
        </div>
    );
}
