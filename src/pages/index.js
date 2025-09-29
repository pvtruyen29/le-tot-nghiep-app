// src/pages/index.js
import { useEffect, useState } from "react";
import Head from 'next/head';
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import RegistrationModal from "../components/RegistrationModal";

const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return 'Chưa có thông tin';
    return new Date(timestamp.toDate()).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export default function Home() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "events"));
                let eventsData = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                eventsData.sort((a, b) => {
                    const timeA = a.eventTime?.toMillis() || Infinity;
                    const timeB = b.eventTime?.toMillis() || Infinity;
                    return timeA - timeB;
                });
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
        setSelectedEvent(event);
        setIsRegisterModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsRegisterModalOpen(false);
        setSelectedEvent(null);
    };

    if (loading) {
        return <div style={{ textAlign: 'center', paddingTop: '5rem', fontSize: '1.5rem' }}>Đang tải danh sách sự kiện...</div>;
    }

    return (
        <div className="container">
            <Head>
                <title>Sự kiện Tốt nghiệp - Đại học Cần Thơ</title>
                <link rel="icon" href="https://www.ctu.edu.vn/images/branding/logo/favicon.ico" />
            </Head>
            <header className="hero-banner">
                <img src="https://www.ctu.edu.vn/images/branding/logo/CTU_logo.png" alt="Logo Đại học Cần Thơ" className="hero-logo"/>
                <h1>Hệ thống Đăng ký Sự kiện Lễ Tốt nghiệp</h1>
            </header>
            <main>
                <div className="event-grid-detailed">
                    {events.length > 0 ? events.map((event) => (
                        <div key={event.id} className="event-card-detailed">
                            <img src={event.imageUrl} alt={event.title} className="event-card-image" />
                            <div className="event-info">
                                <h3>{event.title}</h3>
                                {/* SỬA LỖI: Nhóm thông tin vào div mới để chia cột */}
                                <div className="info-grid">
                                    <p className="info-item"><strong>🏢 Đơn vị:</strong> {event.organizer || 'Chưa cập nhật'}</p>
                                    <p className="info-item"><strong>📍 Địa điểm:</strong> {event.location || 'Chưa cập nhật'}</p>
                                    <p className="info-item"><strong>🗓️ Thời gian:</strong> {formatDate(event.eventTime)}</p>
                                    <p className="info-item"><strong>🕔 Bắt đầu ĐK:</strong> {formatDate(event.startTime)}</p>
                                    <p className="info-item"><strong>🕔 Hạn chót ĐK:</strong> {formatDate(event.endTime)}</p>
                                    <p className="info-item"><strong>📊 Số lượng:</strong> {event.registeredCount || 0} / {event.eligibleCount || 'N/A'}</p>
                                </div>
                                {event.notes && <p className="info-item notes"><strong>📝 Ghi chú:</strong> {event.notes}</p>}
                                <button className="register-btn" onClick={() => handleRegisterClick(event)}>
                                    Đăng ký ngay
                                </button>
                            </div>
                        </div>
                    )) : (
                        <p style={{ textAlign: 'center' }}>Hiện tại chưa có sự kiện nào được công bố.</p>
                    )}
                </div>
            </main>
            {isRegisterModalOpen && <RegistrationModal event={selectedEvent} onClose={handleCloseModal} />}
        </div>
    );
}
