/**
 * Bộ mã nguồn Google Apps Script chuẩn cho Cơ sở dữ liệu data1 và data2
 * Tác giả & Bản quyền: Lê Hoà Hiệp - 0983.676.470
 */

export const APPS_SCRIPT_DATA1 = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT CHO SHEET DATA1 (CẤU HÌNH & NỘI DUNG ĐỀ THI)
 * Bản quyền: Lê Hoà Hiệp - 0983.676.470
 * =========================================================================
 * HƯỚNG DẪN CÀI ĐẶT TRÊN GOOGLE SHEETS DATA1:
 * 1. Mở Google Sheet chứa đề thi (data1).
 * 2. Chọn menu 'Tiện ích mở rộng' (Extensions) -> 'Apps Script'.
 * 3. Xoá mã mặc định và dán toàn bộ đoạn mã này vào.
 * 4. Nhấn nút 'Lưu' (biểu tượng đĩa mềm hoặc Ctrl+S).
 * 5. Nhấn nút 'Triển khai' (Deploy) -> 'Triển khai mới' (New deployment).
 * 6. Chọn loại: 'Ứng dụng web' (Web app).
 * 7. Mô tả: "API De Thi data1".
 * 8. Thực thi dưới dạng: "Tôi" (User me).
 * 9. Ai có quyền truy cập: "Bất kỳ ai" (Anyone).
 * 10. Nhấn 'Triển khai' -> Cấp quyền truy cập nếu được yêu cầu -> Sao chép 'URL ứng dụng web'.
 * 11. Dán URL vừa sao chép vào ô Cấu hình của ứng dụng "KIỂM TRA THƯỜNG XUYÊN".
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet(); // Hoặc ss.getSheetByName("data1");
    
    // 1. Đọc thông tin cấu hình kỳ thi ở Dòng 1
    // A1: Tên kỳ kiểm tra, B1: Môn, C1: Tên trường, D1: Thời gian làm bài (phút)
    var examName = sheet.getRange("A1").getValue() || "KIỂM TRA THƯỜNG XUYÊN";
    var subject = sheet.getRange("B1").getValue() || "TIN HỌC 6";
    var schoolName = sheet.getRange("C1").getValue() || "TRƯỜNG THCS VÕ VĂN KIỆT";
    var durationVal = sheet.getRange("D1").getValue();
    var durationMinutes = 15;
    if (typeof durationVal === 'number' && durationVal > 0) {
      durationMinutes = durationVal;
    } else if (typeof durationVal === 'string') {
      var match = durationVal.match(/\\d+/);
      if (match) durationMinutes = parseInt(match[0], 10);
    }

    var config = {
      schoolName: schoolName.toString().trim(),
      examName: examName.toString().trim(),
      subject: subject.toString().trim(),
      durationMinutes: durationMinutes,
      copyrightText: "Lê Hoà Hiệp - 0983.676.470"
    };

    // 2. Đọc danh sách câu hỏi từ Dòng 5 trở đi (Dòng 4 là tiêu đề)
    var lastRow = sheet.getLastRow();
    var questions = [];
    
    if (lastRow >= 5) {
      // Đọc 9 cột: A (Loại), B (Câu số), C (Nội dung), D (ĐA A), E (ĐA B), F (ĐA C), G (ĐA D), H (ĐA Đúng), I (Điểm)
      // Lưu ý: Cột H (ĐA Đúng) đối với câu Tự luận lưu dạng: đáp án 1 / đáp án 2 / ... (học sinh gõ 1 trong các đáp án đều chấm đúng)
      var range = sheet.getRange(5, 1, lastRow - 4, 9);
      var values = range.getValues();
      
      for (var i = 0; i < values.length; i++) {
        var row = values[i];
        var qType = (row[0] || "").toString().trim();
        var qOrder = row[1] || (i + 1);
        var qContent = (row[2] || "").toString().trim();
        
        // Bỏ qua dòng trống
        if (!qContent && !qType) continue;

        var optA = (row[3] !== undefined && row[3] !== null) ? row[3].toString().trim() : "";
        var optB = (row[4] !== undefined && row[4] !== null) ? row[4].toString().trim() : "";
        var optC = (row[5] !== undefined && row[5] !== null) ? row[5].toString().trim() : "";
        var optD = (row[6] !== undefined && row[6] !== null) ? row[6].toString().trim() : "";
        var correctAns = (row[7] !== undefined && row[7] !== null) ? row[7].toString().trim() : "";
        var pts = parseFloat(row[8]) || 1.0;

        var qTypeLower = qType.toLowerCase();
        var normalizedType = "Trắc nghiệm 1 đáp án";
        if (qTypeLower.indexOf("tự luận") !== -1 || qTypeLower.indexOf("tu luan") !== -1) {
          normalizedType = "Tự luận";
        } else if (qTypeLower.indexOf("đúng") !== -1 || qTypeLower.indexOf("dung") !== -1 || qTypeLower.indexOf("sai") !== -1 || qTypeLower.indexOf("true") !== -1 || qTypeLower.indexOf("false") !== -1) {
          normalizedType = "Đúng / Sai";
        }

        questions.push({
          id: i + 1,
          orderNumber: qOrder,
          type: normalizedType,
          content: qContent,
          optionA: optA || (normalizedType === "Đúng / Sai" ? "Đúng" : ""),
          optionB: optB || (normalizedType === "Đúng / Sai" ? "Sai" : ""),
          optionC: optC,
          optionD: optD,
          correctAnswer: correctAns,
          points: pts,
          category: normalizedType === "Tự luận" ? "Tự luận & Tính toán" : (normalizedType === "Đúng / Sai" ? "Trắc nghiệm Đúng / Sai" : "Trắc nghiệm cơ bản")
        });
      }
    }

    var result = {
      status: "success",
      timestamp: new Date().toISOString(),
      config: config,
      totalQuestions: questions.length,
      questions: questions
    };

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    var errorResult = {
      status: "error",
      message: error.toString()
    };
    return ContentService.createTextOutput(JSON.stringify(errorResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("data1") || ss.getActiveSheet();

    var data = {};
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else {
      data = e.parameter || {};
    }

    // 1. Cập nhật thông tin kỳ thi ở Dòng 1
    // A1: Tên kỳ kiểm tra, B1: Môn, C1: Tên trường, D1: Thời gian làm bài (phút)
    if (data.config) {
      if (data.config.examName !== undefined) sheet.getRange("A1").setValue(data.config.examName);
      if (data.config.subject !== undefined) sheet.getRange("B1").setValue(data.config.subject);
      if (data.config.schoolName !== undefined) sheet.getRange("C1").setValue(data.config.schoolName);
      if (data.config.durationMinutes !== undefined) sheet.getRange("D1").setValue(Number(data.config.durationMinutes) || 15);
    }

    // 2. Cập nhật danh sách câu hỏi từ Dòng 5 trở đi
    if (data.questions && Array.isArray(data.questions)) {
      // Đảm bảo dòng tiêu đề dòng 4 luôn có định dạng chuẩn
      var headerVal = sheet.getRange("A4").getValue();
      if (!headerVal) {
        var hRange = sheet.getRange("A4:I4");
        hRange.setValues([["Loại", "Câu số", "Nội dung câu hỏi", "Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D", "Đáp án đúng", "Điểm"]]);
        hRange.setFontWeight("bold").setBackground("#0284c7").setFontColor("#ffffff");
      }

      // Xoá toàn bộ nội dung câu hỏi cũ từ dòng 5 trở đi
      var lastRow = sheet.getLastRow();
      if (lastRow >= 5) {
        sheet.getRange(5, 1, lastRow - 4, 9).clearContent();
      }

      // Ghi các câu hỏi mới vào data1
      if (data.questions.length > 0) {
        var rows = [];
        for (var i = 0; i < data.questions.length; i++) {
          var q = data.questions[i];
          rows.push([
            q.type || "Trắc nghiệm 1 đáp án",
            q.orderNumber || (i + 1),
            q.content || "",
            q.optionA || "",
            q.optionB || "",
            q.optionC || "",
            q.optionD || "",
            q.correctAnswer || "",
            Number(q.points) || 1.0
          ]);
        }
        sheet.getRange(5, 1, rows.length, 9).setValues(rows);
      }
    }

    var successResult = {
      status: "success",
      message: "Đã lưu thành công nội dung đề thi vào data1!",
      totalQuestions: (data.questions && data.questions.length) || 0,
      timestamp: new Date().toISOString()
    };

    return ContentService.createTextOutput(JSON.stringify(successResult))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
`;

export const APPS_SCRIPT_DATA2 = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT CHO SHEET DATA2 (LƯU KẾT QUẢ & BẢNG XẾP HẠNG HỌC SINH)
 * Bản quyền: Lê Hoà Hiệp - 0983.676.470
 * =========================================================================
 * CÁC CỘT TRONG SHEET DATA2:
 * Cột A: STT
 * Cột B: TÊN HỌC SINH
 * Cột C: LỚP
 * Cột D: TỔNG ĐIỂM
 * Cột E: ĐIỂM TỪNG CÂU (vd: 1:0.5 2:0.5 3:1... câu bỏ trống ghi 1:-)
 * Cột F: THỜI GIAN HS BẮT ĐẦU (vd: 8:00 04/09/2026)
 * Cột G: THỜI GIAN HS NỘP BÀI (vd: 8:15 04/09/2026)
 * Cột H: TỔNG THỜI GIAN (vd: 00:15)
 * Cột I: IP HỌC SINH (Cột 9 - IP thuê bao của thiết bị HS sử dụng, vd: 113.169.89.135)
 * =========================================================================
 * HƯỚNG DẪN CÀI ĐẶT TRÊN GOOGLE SHEETS DATA2:
 * 1. Mở Google Sheet lưu kết quả (data2).
 * 2. Chọn menu 'Tiện ích mở rộng' (Extensions) -> 'Apps Script'.
 * 3. Dán đoạn mã này vào.
 * 4. Nhấn 'Lưu' -> 'Triển khai' -> 'Triển khai mới' -> 'Ứng dụng web'.
 * 5. Ai có quyền truy cập: "Bất kỳ ai" (Anyone).
 * 6. Sao chép 'URL ứng dụng web' và dán vào ứng dụng!
 */

// Hàm nhận kết quả thi từ học sinh gửi lên
function removeAccents(str) {
  if (!str) return "";
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // Khóa script tối đa 30s để xử lý đồng thời an toàn cho toàn bộ học sinh
  } catch (t) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Hệ thống đang bận lưu bài cho nhiều học sinh, vui lòng thử lại sau vài giây!"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("data2") || ss.getActiveSheet();
    
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = {};
      }
    }
    // Gộp cả e.parameter nếu có
    if (e && e.parameter) {
      for (var key in e.parameter) {
        if (data[key] === undefined || data[key] === null || data[key] === "") {
          data[key] = e.parameter[key];
        }
      }
    }

    var action = String(data.action || (e && e.parameter && e.parameter.action) || "").trim();

    // =========================================================================
    // =========================================================================
    // XỬ LÝ CẬP NHẬT CHẶN / MỞ CHẶN IP TRÊN CỘT J (TRẠNG THÁI) CỦA SHEET DATA2
    // Cột I giữ nguyên IP thuần, Cột J ghi "Chặn" khi chặn (hoặc xóa rỗng khi mở chặn)
    // =========================================================================
    if (action === "updateIpBlock" || action === "blockIp" || action === "unblockIp") {
      var rawTargetIp = String(data.targetIp || data.cleanIp || (e && e.parameter && (e.parameter.targetIp || e.parameter.ip)) || "").trim();
      var cleanTarget = rawTargetIp.replace(/^\s*block(ed)?\s*[-:_]?\s*/gi, "").replace(/\s*[-:_]?\s*block(ed)?\s*$/gi, "");
      if (cleanTarget.indexOf(",") !== -1) cleanTarget = cleanTarget.split(",")[0].replace(/^\s*block(ed)?\s*[-:_]?\s*/gi, "").replace(/\s*[-:_]?\s*block(ed)?\s*$/gi, "");
      cleanTarget = cleanTarget.replace(/^[-:_,\s]+|[-:_,\s]+$/g, "").replace(/\s+/g, "").trim();

      var isBlockedParam = data.isBlocked === true || String(data.isBlocked) === "true" || (e && e.parameter && e.parameter.isBlocked === "true") || action === "blockIp";
      var statusValue = isBlockedParam ? "Chặn" : "";

      var lastRow = sheet.getLastRow();
      var lastCol = Math.max(sheet.getLastColumn(), 10);
      var ipColIdx = 8; // Mặc định Cột I (chỉ số 8, cột 9) là IP học sinh
      var statusColIdx = 9; // Mặc định Cột J (chỉ số 9, cột 10) là Trạng thái
      if (lastRow >= 1) {
        var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0] || [];
        for (var h = 0; h < headers.length; h++) {
          var hText = removeAccents(String(headers[h] || "")).toLowerCase();
          if (hText.indexOf("ip") !== -1 || hText.indexOf("cot 9") !== -1 || hText.indexOf("cot i") !== -1) {
            ipColIdx = h;
          } else if (hText.indexOf("trang thai") !== -1 || hText.indexOf("status") !== -1 || hText.indexOf("cot 10") !== -1 || hText.indexOf("cot j") !== -1) {
            statusColIdx = h;
          }
        }
        if (statusColIdx === ipColIdx) {
          statusColIdx = ipColIdx + 1;
        }

        // Tự động thêm tiêu đề "Trạng thái" nếu Cột J chưa có tiêu đề
        var statusHeaderVal = String(headers[statusColIdx] || "").trim();
        if (!statusHeaderVal) {
          sheet.getRange(1, statusColIdx + 1).setValue("Trạng thái");
        }
      }

      var updatedCount = 0;
      if (lastRow >= 2 && cleanTarget) {
        var numRows = lastRow - 1;
        var ipRange = sheet.getRange(2, ipColIdx + 1, numRows, 1);
        var statusRange = sheet.getRange(2, statusColIdx + 1, numRows, 1);
        var ipValues = ipRange.getValues();
        var statusValues = statusRange.getValues();

        for (var r = 0; r < ipValues.length; r++) {
          var currentVal = String(ipValues[r][0] || "").trim();
          var currentClean = currentVal.replace(/^\s*block(ed)?\s*[-:_]?\s*/gi, "").replace(/\s*[-:_]?\s*block(ed)?\s*$/gi, "");
          if (currentVal.indexOf(",") !== -1) currentClean = currentVal.split(",")[0].replace(/^\s*block(ed)?\s*[-:_]?\s*/gi, "").replace(/\s*[-:_]?\s*block(ed)?\s*$/gi, "");
          currentClean = currentClean.replace(/^[-:_,\s]+|[-:_,\s]+$/g, "").replace(/\s+/g, "").trim();

          if (currentClean && currentClean === cleanTarget) {
            // Giữ IP thuần sạch tại Cột I, xóa mọi - Block cũ nếu có
            ipValues[r][0] = cleanTarget;
            // Ghi trạng thái "Chặn" hoặc rỗng "" vào Cột J (Trạng thái)
            statusValues[r][0] = statusValue;
            updatedCount++;
          }
        }
        if (updatedCount > 0) {
          ipRange.setValues(ipValues);
          statusRange.setValues(statusValues);
          SpreadsheetApp.flush();
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        action: "updateIpBlock",
        targetIp: cleanTarget,
        isBlocked: isBlockedParam,
        statusValue: statusValue,
        updatedRows: updatedCount,
        message: "Đã cập nhật trạng thái " + (isBlockedParam ? "CHẶN" : "MỞ CHẶN") + " cho IP " + cleanTarget + " trên Google Sheet data2!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var isUpdate = (
      data.action === "update" ||
      data.action === "edit" ||
      data.action === "regrade" ||
      data.isUpdate === true ||
      String(data.isUpdate) === "true" ||
      (e && e.parameter && (e.parameter.action === "update" || e.parameter.isUpdate === "true"))
    );

    var studentName = String(data.studentName || data.name || "Học sinh").trim();
    var className = String(data.className || data.class || "").trim();
    var totalScore = data.totalScore !== undefined ? Number(data.totalScore) : 0;
    var scoreString = String(data.scoreString || data.detailedScores || "");
    var startTime = data.startTime || "";
    var endTime = data.endTime || "";
    var totalDuration = data.totalDuration || "";
    var clientIp = data.ip || data.ipAddress || data.clientIp || data.ipHocSinh || "";

    var lastRow = sheet.getLastRow();
    var lastCol = Math.max(sheet.getLastColumn(), 10);

    // 1. Tự động nhận diện cột từ dòng tiêu đề (Dòng 1)
    var headers = lastRow >= 1 ? (sheet.getRange(1, 1, 1, lastCol).getValues()[0] || []) : [];
    var sttColIdx = 0;        // Mặc định Cột A (0)
    var nameColIdx = 1;       // Mặc định Cột B (1)
    var classColIdx = 2;      // Mặc định Cột C (2)
    var scoreColIdx = 3;      // Mặc định Cột D (3)
    var detailColIdx = 4;     // Mặc định Cột E (4)
    var ipColIdx = 8;         // Mặc định Cột I (8)
    var statusColIdx = 9;     // Mặc định Cột J (9) - Trạng thái

    for (var h = 0; h < headers.length; h++) {
      var hText = removeAccents(String(headers[h] || ""));
      if (hText.indexOf("stt") !== -1 || hText === "so thu tu") sttColIdx = h;
      else if (hText.indexOf("ten") !== -1 || hText.indexOf("ho ten") !== -1 || hText.indexOf("hoc sinh") !== -1) nameColIdx = h;
      else if (hText.indexOf("lop") !== -1 || hText.indexOf("class") !== -1) classColIdx = h;
      else if (hText.indexOf("tong diem") !== -1 || hText === "diem" || hText.indexOf("score") !== -1) scoreColIdx = h;
      else if (hText.indexOf("diem tung cau") !== -1 || hText.indexOf("chi tiet") !== -1) detailColIdx = h;
      else if (hText.indexOf("ip") !== -1 || hText.indexOf("cot 9") !== -1 || hText.indexOf("cot i") !== -1) ipColIdx = h;
      else if (hText.indexOf("trang thai") !== -1 || hText.indexOf("status") !== -1 || hText.indexOf("cot 10") !== -1 || hText.indexOf("cot j") !== -1) statusColIdx = h;
    }
    if (statusColIdx === ipColIdx) {
      statusColIdx = ipColIdx + 1;
    }

    // Nhận diện các cột từng câu hỏi trong datasheet (VD: "Câu 1", "Câu 2", "C1", "C2", "Q1",...)
    var questionCols = {};
    for (var h = 0; h < headers.length; h++) {
      var rawH = String(headers[h] || "").trim();
      var cleanH = removeAccents(rawH).toLowerCase();
      if (h === sttColIdx || h === nameColIdx || h === classColIdx || h === scoreColIdx || h === ipColIdx || h === statusColIdx) {
        continue;
      }
      var qMatch = cleanH.match(/^(?:cau|c|q)\s*(\d+)$/i);
      if (qMatch) {
        questionCols[parseInt(qMatch[1], 10)] = h;
      } else if (/^\d+$/.test(cleanH) && h >= 3) {
        questionCols[parseInt(cleanH, 10)] = h;
      }
    }

    // =========================================================================
    // TRƯỜNG HỢP 1: BÀI NỘP MỚI CỦA HỌC SINH (!isUpdate)
    // TUYỆT ĐỐI KHÔNG TÌM KIẾM DÒNG CŨ ĐỂ GHI ĐÈ!
    // LUÔN LUÔN THÊM DÒNG MỚI VÀO CUỐI BẢNG ĐỂ TRÁNH NHẦM LẪN HỌC SINH!
    // =========================================================================
    if (!isUpdate) {
      // Bảo vệ: Tuyệt đối không thêm dòng mới nếu không có tên học sinh nộp bài hoặc có yêu cầu preventNewRow
      if (data.preventNewRow === true || String(data.preventNewRow) === "true" || (!data.studentName && !data.name)) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "ignored",
          message: "Đã bỏ qua thao tác thêm dòng do không có thông tin học sinh nộp bài hoặc có cờ bảo vệ!"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var nextRow = Math.max(lastRow + 1, 2);
      var nextSTT = 1;

      if (lastRow >= 2) {
        var lastSTTVal = sheet.getRange(lastRow, sttColIdx + 1).getValue();
        var parsedSTT = parseInt(lastSTTVal, 10);
        if (!isNaN(parsedSTT) && parsedSTT > 0) {
          nextSTT = parsedSTT + 1;
        } else {
          nextSTT = lastRow; // Dòng 2 -> STT 1, dòng 3 -> STT 2,...
        }
      }

      // Đảm bảo dòng tiêu đề có cột Trạng thái nếu chưa có
      if (headers.length <= statusColIdx || !headers[statusColIdx]) {
        sheet.getRange(1, statusColIdx + 1).setValue("Trạng thái");
      }

      var newRowData = new Array(Math.max(lastCol, 10));
      for (var k = 0; k < newRowData.length; k++) newRowData[k] = "";
      newRowData[sttColIdx] = nextSTT;
      newRowData[nameColIdx] = studentName;
      newRowData[classColIdx] = className;
      newRowData[scoreColIdx] = totalScore;
      newRowData[detailColIdx] = scoreString;
      newRowData[5] = startTime;
      newRowData[6] = endTime;
      newRowData[7] = totalDuration;
      newRowData[ipColIdx] = clientIp;
      newRowData[statusColIdx] = data.status || (data.isBlocked ? "Chặn" : "");

      // Điền điểm từng câu vào các cột câu tương ứng
      if (data.questionScores && typeof data.questionScores === "object") {
        for (var qKey in data.questionScores) {
          var qN = parseInt(qKey, 10);
          if (!isNaN(qN) && questionCols[qN] !== undefined && questionCols[qN] < newRowData.length) {
            newRowData[questionCols[qN]] = data.questionScores[qKey];
          }
        }
      }

      sheet.getRange(nextRow, 1, 1, newRowData.length).setValues([newRowData]);
      SpreadsheetApp.flush(); // Đảm bảo ghi xong nguyên vẹn vào Google Sheet

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        action: "inserted",
        message: "Đã lưu kết quả bài thi của học sinh " + studentName + " vào Google Sheet thành công!",
        stt: nextSTT,
        row: nextRow,
        studentName: studentName,
        totalScore: totalScore,
        clientIp: clientIp
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================================
    // TRƯỜNG HỢP 2: GIÁO VIÊN SỬA ĐIỂM / CHẤM LẠI (isUpdate === true)
    // CHỈ CHẠY KHI GIÁO VIÊN BẤM SỬA ĐIỂM HOẶC CHẤM LẠI TRÊN GIAO DIỆN QUẢN TRỊ!
    // =========================================================================
    var targetRow = -1;

    if (lastRow >= 2) {
      var allRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      var cleanTargetName = removeAccents(studentName).trim();
      var cleanTargetClass = removeAccents(className).trim();
      var rawTargetName = cleanTargetName.replace(/\s+/g, "");
      var rawTargetClass = cleanTargetClass.replace(/\s+/g, "");
      var targetSTT = (data.stt !== undefined && data.stt !== null && String(data.stt).trim() !== "") ? parseInt(data.stt, 10) : -1;
      var cleanTargetEndTime = String(endTime || "").trim();
      var cleanTargetStartTime = String(startTime || "").trim();

      // Vòng 1: Tìm theo Tên + Lớp CHÍNH XÁC VÀ (STT hoặc Thời gian nộp)
      if (rawTargetName) {
        for (var r = 0; r < allRows.length; r++) {
          var rName = removeAccents(String(allRows[r][nameColIdx] || "")).trim();
          var rClass = removeAccents(String(allRows[r][classColIdx] || "")).trim();
          var rRawName = rName.replace(/\s+/g, "");
          var rRawClass = rClass.replace(/\s+/g, "");

          // BẮT BUỘC SO KHỚP CHÍNH XÁC (===), TUYỆT ĐỐI KHÔNG DÙNG indexOf ĐỂ TRÁNH NHẬN NHẦM TÊN!
          var nameMatches = (rName === cleanTargetName) || (rRawName === rawTargetName);
          var classMatches = !rawTargetClass || !rRawClass || (rRawClass === rawTargetClass);

          if (nameMatches && classMatches) {
            var valSTT = parseInt(allRows[r][sttColIdx], 10);
            var valEndTime = String(allRows[r][6] || "").trim();
            var valStartTime = String(allRows[r][5] || "").trim();

            var sttMatches = (targetSTT > 0 && !isNaN(valSTT) && valSTT === targetSTT);
            var timeMatches = (cleanTargetEndTime && (valEndTime === cleanTargetEndTime || valStartTime === cleanTargetEndTime)) ||
                              (cleanTargetStartTime && (valStartTime === cleanTargetStartTime || valEndTime === cleanTargetStartTime));

            if (sttMatches || timeMatches) {
              targetRow = r + 2;
              break;
            }
          }
        }
      }

      // Vòng 2: Nếu chưa tìm thấy dòng theo STT/Thời gian, lấy dòng gần nhất khớp CHÍNH XÁC Tên + Lớp
      if (targetRow === -1 && rawTargetName) {
        for (var r = allRows.length - 1; r >= 0; r--) {
          var rName = removeAccents(String(allRows[r][nameColIdx] || "")).trim();
          var rClass = removeAccents(String(allRows[r][classColIdx] || "")).trim();
          var rRawName = rName.replace(/\s+/g, "");
          var rRawClass = rClass.replace(/\s+/g, "");

          var nameMatches = (rName === cleanTargetName) || (rRawName === rawTargetName);
          var classMatches = !rawTargetClass || !rRawClass || (rRawClass === rawTargetClass);

          if (nameMatches && classMatches) {
            targetRow = r + 2;
            break;
          }
        }
      }
    }

    if (targetRow === -1) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Không tìm thấy học sinh " + studentName + (className ? " lớp " + className : "") + " trong bảng tính để sửa điểm!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // A. CẬP NHẬT ĐIỂM MỚI CỦA CÂU ĐÓ VÀO ĐÚNG CỘT CÂU TƯƠNG ỨNG TRÊN DATASHEET
    var targetOrderNum = data.targetOrderNumber !== undefined ? parseInt(data.targetOrderNumber, 10) : (e && e.parameter && e.parameter.targetOrderNumber ? parseInt(e.parameter.targetOrderNumber, 10) : -1);
    var targetQScore = data.questionScore !== undefined ? Number(data.questionScore) : (e && e.parameter && e.parameter.questionScore !== undefined ? Number(e.parameter.questionScore) : null);

    if (targetOrderNum !== -1 && targetQScore !== null) {
      if (questionCols[targetOrderNum] !== undefined) {
        sheet.getRange(targetRow, questionCols[targetOrderNum] + 1).setValue(targetQScore);
      }
    }

    // B. Cập nhật tất cả các câu từ questionScores nếu có
    var qScores = data.questionScores;
    if (qScores && typeof qScores === "object") {
      for (var qKey in qScores) {
        var qN = parseInt(qKey, 10);
        if (!isNaN(qN) && questionCols[qN] !== undefined) {
          sheet.getRange(targetRow, questionCols[qN] + 1).setValue(qScores[qKey]);
        }
      }
    }

    // C. TÍNH LẠI TỔNG SỐ ĐIỂM TỪ BÀI LÀM CỦA HỌC SINH (SUM TOÀN BỘ CÁC CỘT CÂU HỎI)
    var finalCalculatedTotal = 0;
    var hasComputedFromColumns = false;
    var questionColKeys = Object.keys(questionCols);

    if (questionColKeys.length > 0) {
      // Đọc lại các ô câu hỏi thực tế trên dòng đó trong datasheet để tính tổng chính xác 100%
      for (var i = 0; i < questionColKeys.length; i++) {
        var qOrder = parseInt(questionColKeys[i], 10);
        var colIdx = questionCols[qOrder];
        var cellVal = sheet.getRange(targetRow, colIdx + 1).getValue();
        var pts = 0;
        if (typeof cellVal === "number") {
          pts = cellVal;
        } else if (cellVal !== "" && cellVal !== null && cellVal !== undefined) {
          var parsedPts = parseFloat(String(cellVal).replace(",", "."));
          if (!isNaN(parsedPts)) pts = parsedPts;
        }
        finalCalculatedTotal += pts;
      }
      hasComputedFromColumns = true;
    } else if (qScores && typeof qScores === "object" && Object.keys(qScores).length > 0) {
      for (var k in qScores) {
        finalCalculatedTotal += Number(qScores[k]) || 0;
      }
      hasComputedFromColumns = true;
    }

    // Nếu tính được từ các cột câu hỏi thì dùng tổng này; nếu không, dùng totalScore từ client gửi lên
    var finalTotalScore = hasComputedFromColumns ? (Math.round(finalCalculatedTotal * 100) / 100) : totalScore;

    // D. Cập nhật số điểm tổng mới của học sinh vào đúng ô cột Tổng điểm
    if (scoreColIdx !== -1) {
      sheet.getRange(targetRow, scoreColIdx + 1).setValue(finalTotalScore);
    }

    // E. Cập nhật chuỗi Điểm từng câu / Chi tiết nếu có
    if (detailColIdx !== -1 && scoreString) {
      sheet.getRange(targetRow, detailColIdx + 1).setValue(scoreString);
    }

    SpreadsheetApp.flush();

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      action: "updated",
      message: "Đã cập nhật điểm câu " + targetOrderNum + " và tính lại tổng điểm: " + finalTotalScore + " đ thành công!",
      row: targetRow,
      studentName: studentName,
      totalScore: finalTotalScore,
      targetOrderNumber: targetOrderNum,
      questionScore: targetQScore
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

// Hàm lấy danh sách kết quả học sinh đã nộp để hiển thị Bảng xếp hạng & Báo cáo
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "";
  if (action === "update" || action === "edit" || (e && e.parameter && (e.parameter.isUpdate === "true" || e.parameter.isUpdate === true))) {
    return doPost(e);
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("data2") || ss.getActiveSheet();
    var lastRow = sheet.getLastRow();
    var lastCol = Math.max(sheet.getLastColumn(), 10);
    
    var submissions = [];
    if (lastRow >= 2) {
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0] || [];
      // Cột 9 trong sheet data2 là IP học sinh, Cột 10 là Trạng thái (Chặn / rỗng)
      var ipColIdx = 8; // Mặc định Cột I (chỉ số 8, cột 9)
      var statusColIdx = 9; // Mặc định Cột J (chỉ số 9, cột 10)
      for (var h = 0; h < headers.length; h++) {
        var hName = removeAccents((headers[h] || "").toString()).toLowerCase();
        if (hName.indexOf("ip") !== -1 || hName.indexOf("cot 9") !== -1 || hName.indexOf("cot i") !== -1) {
          ipColIdx = h;
        } else if (hName.indexOf("trang thai") !== -1 || hName.indexOf("status") !== -1 || hName.indexOf("cot 10") !== -1 || hName.indexOf("cot j") !== -1) {
          statusColIdx = h;
        }
      }
      if (statusColIdx === ipColIdx) {
        statusColIdx = ipColIdx + 1;
      }

      var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        if (!row[1]) continue; // Bỏ qua dòng trống tên học sinh

        // Lấy IP học sinh từ cột IP trong sheet data2
        var rawIp = "";
        if (row[ipColIdx] !== undefined && row[ipColIdx] !== null) {
          rawIp = String(row[ipColIdx]).trim();
        } else if (row[8] !== undefined && row[8] !== null) {
          rawIp = String(row[8]).trim();
        }

        var cleanIp = rawIp.replace(/^\s*block(ed)?\s*[-:_]?\s*/gi, "").replace(/\s*[-:_]?\s*block(ed)?\s*$/gi, "");
        if (rawIp.indexOf(",") !== -1) cleanIp = rawIp.split(",")[0].replace(/^\s*block(ed)?\s*[-:_]?\s*/gi, "").replace(/\s*[-:_]?\s*block(ed)?\s*$/gi, "");
        cleanIp = cleanIp.replace(/^[-:_,\s]+|[-:_,\s]+$/g, "").replace(/\s+/g, "").trim();

        // Lấy Trạng thái từ Cột J (Trạng thái)
        var rawStatus = (row[statusColIdx] !== undefined && row[statusColIdx] !== null) ? String(row[statusColIdx]).trim() : "";
        var cleanStatusLower = removeAccents(rawStatus).toLowerCase();
        var isBlockedRow = cleanStatusLower.indexOf("chan") !== -1 || cleanStatusLower.indexOf("block") !== -1 || /\bblock(ed)?\b/i.test(rawIp);

        submissions.push({
          stt: row[0] || (i + 1),
          studentName: row[1],
          className: row[2],
          totalScore: Number(row[3]) || 0,
          scoreString: row[4] || "",
          startTime: row[5] || "",
          endTime: row[6] || "",
          totalDuration: row[7] || "",
          ipAddress: cleanIp || rawIp,
          status: rawStatus || (isBlockedRow ? "Chặn" : ""),
          isBlocked: isBlockedRow
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      count: submissions.length,
      data: submissions
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

export const APPS_SCRIPT_COMBINED = `/**
 * =========================================================================
 * BỘ MÃ GOOGLE APPS SCRIPT KẾT NỐI ĐỒNG THỜI CẢ 2 SHEET (DATA1 & DATA2)
 * (Dành cho thầy/cô để cả 2 trang tính 'data1' và 'data2' trong cùng 1 file Google Sheets)
 * Tác giả & Bản quyền: Lê Hoà Hiệp - 0983.676.470
 * =========================================================================
 * 
 * HƯỚNG DẪN CÀI ĐẶT NHANH (CHỈ CẦN THỰC HIỆN 1 LẦN):
 * 1. Mở file Google Sheets của thầy/cô (nên có sẵn 2 trang tính đặt tên là: data1 và data2).
 *    (Nếu chưa có, sau khi dán mã này và bấm F5 tải lại trang tính, sẽ có Menu "Kiểm Tra Thường Xuyên"
 *     để tự động tạo mẫu trang data1 và data2 chỉ với 1 cú click).
 * 2. Trên thanh menu Google Sheets, chọn: 'Tiện ích mở rộng' (Extensions) -> 'Apps Script'.
 * 3. Xoá hết mã cũ trong cửa sổ soạn thảo, DÁN TOÀN BỘ MÃ NÀY VÀO.
 * 4. Nhấn biểu tượng ĐĨA MỀM (hoặc phím Ctrl + S) để lưu dự án.
 * 5. Nhấn nút màu xanh: 'Triển khai' (Deploy) -> 'Triển khai mới' (New deployment).
 * 6. Bấm vào biểu tượng bánh răng 'Chọn loại' -> Chọn 'Ứng dụng web' (Web app).
 * 7. Cấu hình triển khai:
 *    - Mô tả: "API Ket Noi Data1 va Data2"
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me - địa chỉ email của thầy/cô)
 *    - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone) -> RẤT QUAN TRỌNG!
 * 8. Nhấn 'Triển khai' (Deploy).
 *    - Bấm 'Ủy quyền truy cập' -> Chọn tài khoản Google của thầy/cô.
 *    - Bấm 'Nâng cao' (Advanced) -> Bấm 'Đi tới... (không an toàn)'.
 *    - Bấm 'Cho phép' (Allow).
 * 9. SAO CHÉP 'URL ứng dụng web' (có dạng https://script.google.com/macros/s/AKfycby.../exec).
 * 10. Dán URL này vào ứng dụng web KIỂM TRA THƯỜNG XUYÊN tại mục "Cài đặt Google Sheets".
 *     (Thầy/cô có thể dán cùng 1 URL này vào cả 2 ô Link Data1 và Link Data2).
 */

// =========================================================================
// 1. MENU TỰ ĐỘNG TẠO MẪU BẢNG TRÊN GOOGLE SHEETS
// =========================================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Kiểm Tra Thường Xuyên")
    .addItem("1. Tạo mẫu sheet data1 (Đề thi & Cấu hình)", "setupData1Sheet")
    .addItem("2. Tạo mẫu sheet data2 (Kết quả & Cột từng câu)", "setupData2Sheet")
    .addItem("3. Quét & Tìm IP trùng nhau (Cột I)", "kiemTraTrungLapIP")
    .addSeparator()
    .addItem("4. Tạo tự động cả 2 sheet data1 & data2", "setupBothSheets")
    .addToUi();
}

function setupBothSheets() {
  setupData1Sheet();
  setupData2Sheet();
  SpreadsheetApp.getUi().alert("Đã khởi tạo thành công cả 2 sheet data1 và data2 theo đúng chuẩn!");
}

function setupData1Sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("data1");
  if (!sheet) {
    sheet = ss.insertSheet("data1");
  }

  // Dòng 1: Cấu hình kỳ thi (A1: Tên kỳ thi, B1: Môn, C1: Tên trường, D1: Thời gian phút)
  sheet.getRange("A1").setValue("KIỂM TRA THƯỜNG XUYÊN");
  sheet.getRange("B1").setValue("TIN HỌC 6");
  sheet.getRange("C1").setValue("TRƯỜNG THCS VÕ VĂN KIỆT");
  sheet.getRange("D1").setValue(15);
  sheet.getRange("A1:D1").setFontWeight("bold").setBackground("#e0f2fe");

  // Dòng 2 & 3: Ghi chú hướng dẫn
  sheet.getRange("A2").setValue("Lưu ý: Dòng 1 là thông tin kỳ thi (A1: Tên kỳ kiểm tra, B1: Môn học, C1: Tên trường, D1: Thời gian làm bài phút). Dòng 4 là tiêu đề cột. Dòng 5 trở đi là danh sách câu hỏi.");
  sheet.getRange("A2:I2").merge().setFontStyle("italic").setFontColor("#64748b");

  // Dòng 4: Tiêu đề các cột đề thi
  var headers = [["Loại", "Câu số", "Nội dung câu hỏi", "Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D", "Đáp án đúng", "Điểm"]];
  var hRange = sheet.getRange("A4:I4");
  hRange.setValues(headers);
  hRange.setFontWeight("bold").setBackground("#0284c7").setFontColor("#ffffff");

  // Câu hỏi mẫu từ dòng 5 nếu sheet còn trống
  if (sheet.getLastRow() < 5) {
    var sampleQuestions = [
      ["Trắc nghiệm 1 đáp án", 1, "Thiết bị nào sau đây là thiết bị vào của máy tính?", "Màn hình", "Bàn phím", "Máy in", "Loa", "B", 1],
      ["Trắc nghiệm 1 đáp án", 2, "1 Terabyte (TB) bằng bao nhiêu Gigabyte (GB)?", "1000", "1024", "2048", "512", "B", 1],
      ["Tự luận", 3, "Bộ nhớ máy tính lưu trữ thông tin dưới dạng các dãy số gồm 2 chữ số nào?", "", "", "", "", "0 và 1 / 0 va 1 / 0, 1 / nhị phân", 2]
    ];
    sheet.getRange(5, 1, sampleQuestions.length, 9).setValues(sampleQuestions);
  }

  sheet.autoResizeColumns(1, 9);
}

function setupData2Sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("data2");
  if (!sheet) {
    sheet = ss.insertSheet("data2");
  }

  // Tiêu đề chuẩn cột sheet data2: Cột 1 đến Cột 9 là thông tin chung, từ Cột 10 trở đi là các câu hỏi
  var headers = [
    "STT",
    "Họ và tên",
    "Lớp",
    "Tổng điểm",
    "Điểm từng câu",
    "Thời gian bắt đầu",
    "Thời gian nộp bài",
    "Thời gian làm bài",
    "IP học sinh (Cột 9)",
    "Câu 1", "Câu 2", "Câu 3", "Câu 4", "Câu 5",
    "Câu 6", "Câu 7", "Câu 8", "Câu 9", "Câu 10",
    "Câu 11", "Câu 12", "Câu 13", "Câu 14", "Câu 15",
    "Câu 16", "Câu 17", "Câu 18", "Câu 19", "Câu 20"
  ];

  var hRange = sheet.getRange(1, 1, 1, headers.length);
  hRange.setValues([headers]);
  hRange.setFontWeight("bold").setBackground("#0284c7").setFontColor("#ffffff");

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 9);
}

// =========================================================================
// THUẬT TOÁN QUÉT & TÌM IP TRÙNG NHAU TRONG CỘT I (DATASHEET 2)
// =========================================================================
function kiemTraTrungLapIP() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("data2") || ss.getActiveSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = Math.max(sheet.getLastColumn(), 9);

  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("Trang tính data2 chưa có dữ liệu nộp bài nào!");
    return;
  }

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var ipColIdx = 8; // Mặc định Cột I (chỉ số 8)
  for (var h = 0; h < headers.length; h++) {
    var hName = removeAccents(String(headers[h] || ""));
    if (hName.indexOf("ip") !== -1 || hName.indexOf("cot 9") !== -1 || hName.indexOf("cot i") !== -1) {
      ipColIdx = h;
      break;
    }
  }

  var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var ipMap = {};

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var studentName = String(row[1] || "").trim();
    if (!studentName) continue;

    var rawIp = "";
    if (row[8] !== undefined && row[8] !== null && String(row[8]).trim() !== "") {
      rawIp = String(row[8]).trim();
    } else if (row[ipColIdx] !== undefined && row[ipColIdx] !== null) {
      rawIp = String(row[ipColIdx]).trim();
    }

    var cleanIp = rawIp.replace(/\\s+/g, "").split(",")[0].trim();
    if (!cleanIp || cleanIp === "-" || cleanIp === "N/A" || cleanIp.toLowerCase() === "null") continue;

    if (!ipMap[cleanIp]) {
      ipMap[cleanIp] = [];
    }
    ipMap[cleanIp].push({
      rowIndex: i + 2,
      stt: row[0],
      studentName: studentName,
      className: String(row[2] || "").trim(),
      totalScore: Number(row[3]) || 0,
      endTime: String(row[6] || row[5] || ""),
      duration: String(row[7] || "")
    });
  }

  var violations = [];
  var rowsToHighlight = [];

  for (var ipKey in ipMap) {
    if (ipMap[ipKey].length > 1) {
      violations.push({
        ip: ipKey,
        count: ipMap[ipKey].length,
        records: ipMap[ipKey]
      });
      for (var r = 0; r < ipMap[ipKey].length; r++) {
        rowsToHighlight.push(ipMap[ipKey][r].rowIndex);
      }
    }
  }

  if (violations.length === 0) {
    SpreadsheetApp.getUi().alert("Tuyệt vời! Không phát hiện địa chỉ IP nào làm bài trên 1 lần trong Cột I.");
    return;
  }

  // Đổi màu cảnh báo trên sheet data2
  for (var k = 0; k < rowsToHighlight.length; k++) {
    sheet.getRange(rowsToHighlight[k], 1, 1, lastCol).setBackground("#fff7ed");
    sheet.getRange(rowsToHighlight[k], ipColIdx + 1).setBackground("#fecdd3");
  }

  // Tự động tạo bảng cảnh báo chi tiết
  var reportSheet = ss.getSheetByName("canh_bao_ip");
  if (!reportSheet) {
    reportSheet = ss.insertSheet("canh_bao_ip");
  } else {
    reportSheet.clear();
  }

  var reportHeaders = [["STT", "Địa chỉ IP (Cột I)", "Lần làm", "Họ và tên HS", "Lớp", "Điểm số", "Thời gian nộp", "Thời lượng", "Phân loại vi phạm"]];
  reportSheet.getRange(1, 1, 1, reportHeaders[0].length).setValues(reportHeaders).setFontWeight("bold").setBackground("#dc2626").setFontColor("#ffffff");

  var outRows = [];
  var outStt = 1;
  for (var v = 0; v < violations.length; v++) {
    var vItem = violations[v];
    var namesSet = {};
    for (var n = 0; n < vItem.records.length; n++) namesSet[vItem.records[n].studentName] = true;
    var isSameStudent = Object.keys(namesSet).length === 1;

    for (var recIdx = 0; recIdx < vItem.records.length; recIdx++) {
      var rec = vItem.records[recIdx];
      outRows.push([
        outStt++,
        vItem.ip,
        "Lần " + (recIdx + 1) + " / " + vItem.count,
        rec.studentName,
        rec.className,
        rec.totalScore,
        rec.endTime,
        rec.duration,
        isSameStudent ? "Cùng 1 HS làm lại nhiều lần (Ôn luyện)" : "Nhiều HS dùng chung 1 máy tính / IP"
      ]);
    }
  }

  if (outRows.length > 0) {
    reportSheet.getRange(2, 1, outRows.length, reportHeaders[0].length).setValues(outRows);
    reportSheet.autoResizeColumns(1, reportHeaders[0].length);
  }

  SpreadsheetApp.getUi().alert(
    "ĐÃ TÌM THẤY " + violations.length + " ĐỊA CHỈ IP LÀM BÀI TRÊN 1 LẦN (CỘT I):\n" +
    "- Tổng số bài nộp liên quan: " + rowsToHighlight.length + " bài\n" +
    "- Chi tiết đã được xuất sang trang tính mới 'canh_bao_ip' và tô màu cảnh báo trên sheet 'data2'!"
  );
}

// =========================================================================
// 2. HÀM HỖ TRỢ XỬ LÝ CHUỖI TIẾNG VIỆT & TÌM KIẾM
// =========================================================================
function removeAccents(str) {
  if (!str) return "";
  var s = String(str).toLowerCase().trim();
  s = s.replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a");
  s = s.replace(/[èéẹẻẽêềếệểễ]/g, "e");
  s = s.replace(/[ìíịỉĩ]/g, "i");
  s = s.replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o");
  s = s.replace(/[ùúụủũưừứựửữ]/g, "u");
  s = s.replace(/[ỳýỵỷỹ]/g, "y");
  s = s.replace(/đ/g, "d");
  return s;
}

// =========================================================================
// 3. XỬ LÝ YÊU CẦU ĐỌC DỮ LIỆU (GET) TỪ ỨNG DỤNG WEB
// =========================================================================
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "";
  var sheetParam = (e && e.parameter && e.parameter.sheet) || "";

  // Nếu là lệnh sửa điểm gửi qua phương thức GET (fallback an toàn cho trình duyệt)
  if (
    action === "update" ||
    action === "edit" ||
    (e && e.parameter && (e.parameter.isUpdate === "true" || e.parameter.isUpdate === true))
  ) {
    return doPost(e);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // TRƯỜNG HỢP A: LẤY BẢNG ĐIỂM & KẾT QUẢ THI CỦA HỌC SINH TỪ SHEET DATA2
  if (
    action === "getSubmissions" ||
    action === "getLeaderboard" ||
    action === "data2" ||
    sheetParam === "data2"
  ) {
    try {
      var sheet2 = ss.getSheetByName("data2") || ss.getActiveSheet();
      var lastRow2 = sheet2.getLastRow();
      var lastCol2 = Math.max(sheet2.getLastColumn(), 10);
      var submissions = [];

      if (lastRow2 >= 2) {
        var headers2 = sheet2.getRange(1, 1, 1, lastCol2).getValues()[0] || [];
        var ipIdx2 = 8; // Mặc định Cột I (chỉ số 8) là IP học sinh
        var statusIdx2 = 9; // Mặc định Cột J (chỉ số 9) là Trạng thái
        for (var h2 = 0; h2 < headers2.length; h2++) {
          var hName2 = removeAccents(String(headers2[h2] || ""));
          if (hName2.indexOf("ip") !== -1 || hName2.indexOf("cot 9") !== -1 || hName2.indexOf("cot i") !== -1) {
            ipIdx2 = h2;
          } else if (hName2.indexOf("trang thai") !== -1 || hName2.indexOf("status") !== -1 || hName2.indexOf("cot 10") !== -1 || hName2.indexOf("cot j") !== -1) {
            statusIdx2 = h2;
          }
        }
        if (statusIdx2 === ipIdx2) {
          statusIdx2 = ipIdx2 + 1;
        }

        var allRows2 = sheet2.getRange(2, 1, lastRow2 - 1, lastCol2).getValues();
        for (var r2 = 0; r2 < allRows2.length; r2++) {
          var rowData = allRows2[r2];
          var studentName = String(rowData[1] || "").trim();
          if (!studentName) continue;

          var rawIp = "";
          if (rowData[ipIdx2] !== undefined && rowData[ipIdx2] !== null) {
            rawIp = String(rowData[ipIdx2]).trim();
          } else if (rowData[8] !== undefined && rowData[8] !== null) {
            rawIp = String(rowData[8]).trim();
          }

          var cleanIp = rawIp.replace(/^\s*block(ed)?\s*[-:_]?\s*/gi, "").replace(/\s*[-:_]?\s*block(ed)?\s*$/gi, "");
          if (rawIp.indexOf(",") !== -1) cleanIp = rawIp.split(",")[0].replace(/^\s*block(ed)?\s*[-:_]?\s*/gi, "").replace(/\s*[-:_]?\s*block(ed)?\s*$/gi, "");
          cleanIp = cleanIp.replace(/^[-:_,\s]+|[-:_,\s]+$/g, "").replace(/\s+/g, "").trim();

          var rawStatus = (rowData[statusIdx2] !== undefined && rowData[statusIdx2] !== null) ? String(rowData[statusIdx2]).trim() : "";
          var cleanStatusLower = removeAccents(rawStatus).toLowerCase();
          var isBlockedRow = cleanStatusLower.indexOf("chan") !== -1 || cleanStatusLower.indexOf("block") !== -1 || /\bblock(ed)?\b/i.test(rawIp);

          submissions.push({
            stt: rowData[0],
            studentName: studentName,
            className: String(rowData[2] || "").trim(),
            totalScore: Number(rowData[3]) || 0,
            scoreString: String(rowData[4] || ""),
            startTime: String(rowData[5] || ""),
            endTime: String(rowData[6] || ""),
            totalDuration: String(rowData[7] || ""),
            ipAddress: cleanIp || rawIp,
            status: rawStatus || (isBlockedRow ? "Chặn" : ""),
            isBlocked: isBlockedRow
          });
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        count: submissions.length,
        data: submissions
      })).setMimeType(ContentService.MimeType.JSON);

    } catch (err2) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: err2.toString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // TRƯỜNG HỢP B (MẶC ĐỊNH): LẤY ĐỀ THI & THÔNG TIN CẤU HÌNH TỪ SHEET DATA1
  try {
    var sheet1 = ss.getSheetByName("data1") || ss.getActiveSheet();

    // 1. Đọc cấu hình ở Dòng 1
    var examName = sheet1.getRange("A1").getValue() || "KIỂM TRA THƯỜNG XUYÊN";
    var subject = sheet1.getRange("B1").getValue() || "TIN HỌC 6";
    var schoolName = sheet1.getRange("C1").getValue() || "TRƯỜNG THCS VÕ VĂN KIỆT";
    var durationVal = sheet1.getRange("D1").getValue();
    var durationMinutes = 15;
    if (typeof durationVal === "number" && durationVal > 0) {
      durationMinutes = durationVal;
    } else if (typeof durationVal === "string") {
      var dMatch = durationVal.match(/\\d+/);
      if (dMatch) durationMinutes = parseInt(dMatch[0], 10);
    }

    var examConfig = {
      schoolName: String(schoolName).trim(),
      examName: String(examName).trim(),
      subject: String(subject).trim(),
      durationMinutes: durationMinutes,
      copyrightText: "Lê Hoà Hiệp - 0983.676.470"
    };

    // 2. Đọc danh sách câu hỏi từ Dòng 5 trở đi
    var lastRow1 = sheet1.getLastRow();
    var questionsList = [];

    if (lastRow1 >= 5) {
      var rawQs = sheet1.getRange(5, 1, lastRow1 - 4, 9).getValues();
      for (var qIdx = 0; qIdx < rawQs.length; qIdx++) {
        var qRow = rawQs[qIdx];
        var contentText = String(qRow[2] || "").trim();
        if (!contentText) continue;

        var typeStr = String(qRow[0] || "").toLowerCase();
        var normalizedType = "Trắc nghiệm 1 đáp án";
        if (typeStr.indexOf("tự luận") !== -1 || typeStr.indexOf("tu luan") !== -1) {
          normalizedType = "Tự luận";
        } else if (typeStr.indexOf("đúng") !== -1 || typeStr.indexOf("dung") !== -1 || typeStr.indexOf("sai") !== -1 || typeStr.indexOf("true") !== -1 || typeStr.indexOf("false") !== -1) {
          normalizedType = "Đúng / Sai";
        }

        questionsList.push({
          id: qIdx + 1,
          orderNumber: qRow[1] || (qIdx + 1),
          type: normalizedType,
          content: contentText,
          optionA: String(qRow[3] || (normalizedType === "Đúng / Sai" ? "Đúng" : "")).trim(),
          optionB: String(qRow[4] || (normalizedType === "Đúng / Sai" ? "Sai" : "")).trim(),
          optionC: String(qRow[5] || "").trim(),
          optionD: String(qRow[6] || "").trim(),
          correctAnswer: (qRow[7] !== undefined && qRow[7] !== null) ? String(qRow[7]).trim() : "",
          points: parseFloat(qRow[8]) || 1.0,
          category: normalizedType === "Tự luận" ? "Tự luận & Tính toán" : (normalizedType === "Đúng / Sai" ? "Trắc nghiệm Đúng / Sai" : "Trắc nghiệm cơ bản")
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      config: examConfig,
      questions: questionsList
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err1) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err1.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// =========================================================================
// 4. XỬ LÝ YÊU CẦU LƯU DỮ LIỆU (POST): NỘP BÀI, CHẤM ĐIỂM HOẶC LƯU ĐỀ THI
// =========================================================================
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Hệ thống đang bận lưu bài cho nhiều học sinh, vui lòng thử lại sau vài giây!"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = {};

    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        data = {};
      }
    }

    if (e && e.parameter) {
      for (var pKey in e.parameter) {
        if (data[pKey] === undefined || data[pKey] === null || data[pKey] === "") {
          data[pKey] = e.parameter[pKey];
        }
      }
    }

    // -----------------------------------------------------------------------
    // NHÁNH 1: LƯU / CHỈNH SỬA ĐỀ THI & CẤU HÌNH VÀO SHEET DATA1
    // -----------------------------------------------------------------------
    if (data.action === "saveExam" || (data.questions && Array.isArray(data.questions))) {
      var sheet1 = ss.getSheetByName("data1") || ss.getActiveSheet();

      // Cập nhật cấu hình Dòng 1
      if (data.config) {
        if (data.config.examName !== undefined) sheet1.getRange("A1").setValue(data.config.examName);
        if (data.config.subject !== undefined) sheet1.getRange("B1").setValue(data.config.subject);
        if (data.config.schoolName !== undefined) sheet1.getRange("C1").setValue(data.config.schoolName);
        if (data.config.durationMinutes !== undefined) sheet1.getRange("D1").setValue(Number(data.config.durationMinutes) || 15);
      }

      // Cập nhật danh sách câu hỏi từ Dòng 5 trở đi
      if (data.questions && Array.isArray(data.questions)) {
        if (!sheet1.getRange("A4").getValue()) {
          var hRange1 = sheet1.getRange("A4:I4");
          hRange1.setValues([["Loại", "Câu số", "Nội dung câu hỏi", "Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D", "Đáp án đúng", "Điểm"]]);
          hRange1.setFontWeight("bold").setBackground("#0284c7").setFontColor("#ffffff");
        }

        var curLastRow1 = sheet1.getLastRow();
        if (curLastRow1 >= 5) {
          sheet1.getRange(5, 1, curLastRow1 - 4, 9).clearContent();
        }

        if (data.questions.length > 0) {
          var questionRows = [];
          for (var qI = 0; qI < data.questions.length; qI++) {
            var qItem = data.questions[qI];
            questionRows.push([
              qItem.type || "Trắc nghiệm 1 đáp án",
              qItem.orderNumber || (qI + 1),
              qItem.content || "",
              qItem.optionA || "",
              qItem.optionB || "",
              qItem.optionC || "",
              qItem.optionD || "",
              qItem.correctAnswer || "",
              Number(qItem.points) || 1.0
            ]);
          }
          sheet1.getRange(5, 1, questionRows.length, 9).setValues(questionRows);
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Đã lưu thành công cấu hình và đề thi vào sheet data1!",
        totalQuestions: (data.questions && data.questions.length) || 0
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // -----------------------------------------------------------------------
    // NHÁNH 2: LƯU KẾT QUẢ NỘP BÀI, CHẶN IP HOẶC CẬP NHẬT ĐIỂM SỐ VÀO SHEET DATA2
    // -----------------------------------------------------------------------
    var sheet2 = ss.getSheetByName("data2") || ss.getActiveSheet();

    // 2.0. XỬ LÝ CẬP NHẬT CHẶN / MỞ CHẶN IP TRÊN CỘT J (TRẠNG THÁI) CỦA SHEET DATA2
    var action = String(data.action || (e && e.parameter && e.parameter.action) || "").trim();
    if (action === "updateIpBlock" || action === "blockIp" || action === "unblockIp") {
      var rawTargetIp = String(data.targetIp || data.cleanIp || (e && e.parameter && (e.parameter.targetIp || e.parameter.ip)) || "").trim();
      var cleanTarget = rawTargetIp.replace(/^\s*block(ed)?\s*[-:_]?\s*/gi, "").replace(/\s*[-:_]?\s*block(ed)?\s*$/gi, "");
      if (cleanTarget.indexOf(",") !== -1) cleanTarget = cleanTarget.split(",")[0].replace(/^\s*block(ed)?\s*[-:_]?\s*/gi, "").replace(/\s*[-:_]?\s*block(ed)?\s*$/gi, "");
      cleanTarget = cleanTarget.replace(/^[-:_,\s]+|[-:_,\s]+$/g, "").replace(/\s+/g, "").trim();

      var isBlockedParam = data.isBlocked === true || String(data.isBlocked) === "true" || (e && e.parameter && e.parameter.isBlocked === "true") || action === "blockIp";
      var statusValue = isBlockedParam ? "Chặn" : "";

      var lastRow2 = sheet2.getLastRow();
      var lastCol2 = Math.max(sheet2.getLastColumn(), 10);
      var ipColIdx = 8; // Mặc định Cột I (chỉ số 8, cột 9) là IP học sinh
      var statusColIdx = 9; // Mặc định Cột J (chỉ số 9, cột 10) là Trạng thái
      if (lastRow2 >= 1) {
        var headers2 = sheet2.getRange(1, 1, 1, lastCol2).getValues()[0] || [];
        for (var h = 0; h < headers2.length; h++) {
          var hText = removeAccents(String(headers2[h] || "")).toLowerCase();
          if (hText.indexOf("ip") !== -1 || hText.indexOf("cot 9") !== -1 || hText.indexOf("cot i") !== -1) {
            ipColIdx = h;
          } else if (hText.indexOf("trang thai") !== -1 || hText.indexOf("status") !== -1 || hText.indexOf("cot 10") !== -1 || hText.indexOf("cot j") !== -1) {
            statusColIdx = h;
          }
        }
        if (statusColIdx === ipColIdx) {
          statusColIdx = ipColIdx + 1;
        }

        // Tự động thêm tiêu đề "Trạng thái" nếu Cột J chưa có tiêu đề
        var statusHeaderVal = String(headers2[statusColIdx] || "").trim();
        if (!statusHeaderVal) {
          sheet2.getRange(1, statusColIdx + 1).setValue("Trạng thái");
        }
      }

      var updatedCount = 0;
      if (lastRow2 >= 2 && cleanTarget) {
        var numRows2 = lastRow2 - 1;
        var ipRange2 = sheet2.getRange(2, ipColIdx + 1, numRows2, 1);
        var statusRange2 = sheet2.getRange(2, statusColIdx + 1, numRows2, 1);
        var ipValues = ipRange2.getValues();
        var statusValues = statusRange2.getValues();

        for (var r = 0; r < ipValues.length; r++) {
          var currentVal = String(ipValues[r][0] || "").trim();
          var currentClean = currentVal.replace(/^\s*block(ed)?\s*[-:_]?\s*/gi, "").replace(/\s*[-:_]?\s*block(ed)?\s*$/gi, "");
          if (currentVal.indexOf(",") !== -1) currentClean = currentVal.split(",")[0].replace(/^\s*block(ed)?\s*[-:_]?\s*/gi, "").replace(/\s*[-:_]?\s*block(ed)?\s*$/gi, "");
          currentClean = currentClean.replace(/^[-:_,\s]+|[-:_,\s]+$/g, "").replace(/\s+/g, "").trim();

          if (currentClean && currentClean === cleanTarget) {
            // Giữ IP thuần sạch tại Cột I
            ipValues[r][0] = cleanTarget;
            // Ghi trạng thái "Chặn" hoặc rỗng "" vào Cột J (Trạng thái)
            statusValues[r][0] = statusValue;
            updatedCount++;
          }
        }
        if (updatedCount > 0) {
          ipRange2.setValues(ipValues);
          statusRange2.setValues(statusValues);
          SpreadsheetApp.flush();
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        action: "updateIpBlock",
        targetIp: cleanTarget,
        isBlocked: isBlockedParam,
        statusValue: statusValue,
        updatedRows: updatedCount,
        message: "Đã cập nhật trạng thái " + (isBlockedParam ? "CHẶN" : "MỞ CHẶN") + " cho IP " + cleanTarget + " trên sheet data2!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var isUpdate = (
      data.action === "update" ||
      data.action === "edit" ||
      data.action === "regrade" ||
      data.isUpdate === true ||
      String(data.isUpdate) === "true" ||
      (e && e.parameter && (e.parameter.action === "update" || e.parameter.isUpdate === "true"))
    );

    var studentName = String(data.studentName || data.name || "Học sinh").trim();
    var className = String(data.className || data.class || "").trim();
    var totalScore = data.totalScore !== undefined ? Number(data.totalScore) : 0;
    var scoreString = String(data.scoreString || data.detailedScores || "");
    var startTime = String(data.startTime || "");
    var endTime = String(data.endTime || "");
    var totalDuration = String(data.totalDuration || "");
    var clientIp = String(data.ip || data.ipAddress || data.clientIp || data.ipHocSinh || "");

    var lastRow2 = sheet2.getLastRow();
    var lastCol2 = Math.max(sheet2.getLastColumn(), 10);

    // 1. Nhận diện các cột tiêu chuẩn từ Dòng 1
    var headers2 = lastRow2 >= 1 ? (sheet2.getRange(1, 1, 1, lastCol2).getValues()[0] || []) : [];
    var sttColIdx = 0;    // Mặc định Cột A (0)
    var nameColIdx = 1;   // Mặc định Cột B (1)
    var classColIdx = 2;  // Mặc định Cột C (2)
    var scoreColIdx = 3;  // Mặc định Cột D (3)
    var detailColIdx = 4; // Mặc định Cột E (4)
    var ipColIdx = 8;     // Mặc định Cột I (8)
    var statusColIdx = 9; // Mặc định Cột J (9) - Trạng thái

    for (var h = 0; h < headers2.length; h++) {
      var hText = removeAccents(String(headers2[h] || ""));
      if (hText.indexOf("stt") !== -1 || hText === "so thu tu") sttColIdx = h;
      else if (hText.indexOf("ten") !== -1 || hText.indexOf("ho ten") !== -1 || hText.indexOf("hoc sinh") !== -1) nameColIdx = h;
      else if (hText.indexOf("lop") !== -1 || hText.indexOf("class") !== -1) classColIdx = h;
      else if (hText.indexOf("tong diem") !== -1 || hText === "diem" || hText.indexOf("score") !== -1) scoreColIdx = h;
      else if (hText.indexOf("diem tung cau") !== -1 || hText.indexOf("chi tiet") !== -1) detailColIdx = h;
      else if (hText.indexOf("ip") !== -1 || hText.indexOf("cot 9") !== -1 || hText.indexOf("cot i") !== -1) ipColIdx = h;
      else if (hText.indexOf("trang thai") !== -1 || hText.indexOf("status") !== -1 || hText.indexOf("cot 10") !== -1 || hText.indexOf("cot j") !== -1) statusColIdx = h;
    }
    if (statusColIdx === ipColIdx) {
      statusColIdx = ipColIdx + 1;
    }

    // 2. Nhận diện các cột từng câu hỏi trong datasheet (VD: "Câu 1", "Câu 2", "C1", "C2", "Q1",...)
    var questionCols = {};
    for (var qCol = 0; qCol < headers2.length; qCol++) {
      var rawHead = String(headers2[qCol] || "").trim();
      var cleanHead = removeAccents(rawHead).toLowerCase();
      if (qCol === sttColIdx || qCol === nameColIdx || qCol === classColIdx || qCol === scoreColIdx || qCol === ipColIdx || qCol === statusColIdx) {
        continue;
      }
      var qMatch = cleanHead.match(/^(?:cau|c|q)\s*(\d+)$/i);
      if (qMatch) {
        questionCols[parseInt(qMatch[1], 10)] = qCol;
      } else if (/^\d+$/.test(cleanHead) && qCol >= 3) {
        questionCols[parseInt(cleanHead, 10)] = qCol;
      }
    }

    // =========================================================================
    // TRƯỜNG HỢP 1: BÀI NỘP MỚI CỦA HỌC SINH (!isUpdate)
    // TUYỆT ĐỐI KHÔNG TÌM KIẾM DÒNG CŨ ĐỂ GHI ĐÈ!
    // LUÔN LUÔN THÊM DÒNG MỚI VÀO CUỐI BẢNG ĐỂ TRÁNH NHẦM LẪN HỌC SINH!
    // =========================================================================
    if (!isUpdate) {
      // Bảo vệ: Tuyệt đối không thêm dòng mới nếu không có tên học sinh nộp bài hoặc có yêu cầu preventNewRow
      if (data.preventNewRow === true || String(data.preventNewRow) === "true" || (!data.studentName && !data.name)) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "ignored",
          message: "Đã bỏ qua thao tác thêm dòng do không có thông tin học sinh nộp bài hoặc có cờ bảo vệ!"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var nextRow = Math.max(lastRow2 + 1, 2);
      var nextSTT = 1;
      if (lastRow2 >= 2) {
        var prevSTT = parseInt(sheet2.getRange(lastRow2, sttColIdx + 1).getValue(), 10);
        nextSTT = (!isNaN(prevSTT) && prevSTT > 0) ? prevSTT + 1 : lastRow2;
      }

      // Đảm bảo dòng tiêu đề có cột Trạng thái nếu chưa có
      if (headers2.length <= statusColIdx || !headers2[statusColIdx]) {
        sheet2.getRange(1, statusColIdx + 1).setValue("Trạng thái");
      }

      var newRowData = new Array(Math.max(lastCol2, 10));
      for (var k = 0; k < newRowData.length; k++) newRowData[k] = "";
      newRowData[sttColIdx] = nextSTT;
      newRowData[nameColIdx] = studentName;
      newRowData[classColIdx] = className;
      newRowData[scoreColIdx] = totalScore;
      newRowData[detailColIdx] = scoreString;
      newRowData[5] = startTime;
      newRowData[6] = endTime;
      newRowData[7] = totalDuration;
      newRowData[ipColIdx] = clientIp;
      newRowData[statusColIdx] = data.status || (data.isBlocked ? "Chặn" : "");

      // Điền điểm từng câu vào các cột câu tương ứng nếu datasheet có cột câu
      if (data.questionScores && typeof data.questionScores === "object") {
        for (var qKey2 in data.questionScores) {
          var qN2 = parseInt(qKey2, 10);
          if (!isNaN(qN2) && questionCols[qN2] !== undefined && questionCols[qN2] < newRowData.length) {
            newRowData[questionCols[qN2]] = data.questionScores[qKey2];
          }
        }
      }

      sheet2.getRange(nextRow, 1, 1, newRowData.length).setValues([newRowData]);
      SpreadsheetApp.flush();

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        action: "inserted",
        stt: nextSTT,
        row: nextRow,
        studentName: studentName,
        totalScore: totalScore,
        clientIp: clientIp
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================================
    // TRƯỜNG HỢP 2: GIÁO VIÊN SỬA ĐIỂM / CHẤM LẠI (isUpdate === true)
    // CHỈ CHẠY KHI GIÁO VIÊN BẤM SỬA ĐIỂM HOẶC CHẤM LẠI TRÊN GIAO DIỆN QUẢN TRỊ!
    // =========================================================================
    var targetRow = -1;

    if (lastRow2 >= 2) {
      var allRows = sheet2.getRange(2, 1, lastRow2 - 1, lastCol2).getValues();
      var cleanTargetName = removeAccents(studentName).trim();
      var cleanTargetClass = removeAccents(className).trim();
      var rawTargetName = cleanTargetName.replace(/\\s+/g, "");
      var rawTargetClass = cleanTargetClass.replace(/\\s+/g, "");
      var targetSTT = (data.stt !== undefined && data.stt !== null && String(data.stt).trim() !== "") ? parseInt(data.stt, 10) : -1;
      var cleanTargetEndTime = String(endTime || "").trim();
      var cleanTargetStartTime = String(startTime || "").trim();

      // Vòng 1: Tìm theo Tên + Lớp CHÍNH XÁC VÀ (STT hoặc Thời gian nộp)
      if (rawTargetName) {
        for (var rIdx = 0; rIdx < allRows.length; rIdx++) {
          var rName = removeAccents(String(allRows[rIdx][nameColIdx] || "")).trim();
          var rClass = removeAccents(String(allRows[rIdx][classColIdx] || "")).trim();
          var rRawName = rName.replace(/\\s+/g, "");
          var rRawClass = rClass.replace(/\\s+/g, "");

          var nameMatches = (rName === cleanTargetName) || (rRawName === rawTargetName);
          var classMatches = !rawTargetClass || !rRawClass || (rRawClass === rawTargetClass);

          if (nameMatches && classMatches) {
            var valSTT = parseInt(allRows[rIdx][sttColIdx], 10);
            var valEndTime = String(allRows[rIdx][6] || "").trim();
            var valStartTime = String(allRows[rIdx][5] || "").trim();

            var sttMatches = (targetSTT > 0 && !isNaN(valSTT) && valSTT === targetSTT);
            var timeMatches = (cleanTargetEndTime && (valEndTime === cleanTargetEndTime || valStartTime === cleanTargetEndTime)) ||
                              (cleanTargetStartTime && (valStartTime === cleanTargetStartTime || valEndTime === cleanTargetStartTime));

            if (sttMatches || timeMatches) {
              targetRow = rIdx + 2;
              break;
            }
          }
        }
      }

      // Vòng 2: Nếu chưa tìm thấy dòng theo STT/thời gian, mới lấy dòng gần nhất khớp CHÍNH XÁC Tên + Lớp
      if (targetRow === -1 && rawTargetName) {
        for (var rIdx = allRows.length - 1; rIdx >= 0; rIdx--) {
          var rName = removeAccents(String(allRows[rIdx][nameColIdx] || "")).trim();
          var rClass = removeAccents(String(allRows[rIdx][classColIdx] || "")).trim();
          var rRawName = rName.replace(/\\s+/g, "");
          var rRawClass = rClass.replace(/\\s+/g, "");

          var nameMatches = (rName === cleanTargetName) || (rRawName === rawTargetName);
          var classMatches = !rawTargetClass || !rRawClass || (rRawClass === rawTargetClass);

          if (nameMatches && classMatches) {
            targetRow = rIdx + 2;
            break;
          }
        }
      }
    }

    if (targetRow === -1) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Không tìm thấy học sinh " + studentName + (className ? " lớp " + className : "") + " trong bảng tính để sửa điểm!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // A. CẬP NHẬT ĐIỂM MỚI CỦA CÂU ĐÓ VÀO ĐÚNG CỘT CÂU TƯƠNG ỨNG TRÊN DATASHEET
    var targetOrderNum = data.targetOrderNumber !== undefined ? parseInt(data.targetOrderNumber, 10) : (e && e.parameter && e.parameter.targetOrderNumber ? parseInt(e.parameter.targetOrderNumber, 10) : -1);
    var targetQScore = data.questionScore !== undefined ? Number(data.questionScore) : (e && e.parameter && e.parameter.questionScore !== undefined ? Number(e.parameter.questionScore) : null);

    if (targetOrderNum !== -1 && targetQScore !== null) {
      if (questionCols[targetOrderNum] !== undefined) {
        sheet2.getRange(targetRow, questionCols[targetOrderNum] + 1).setValue(targetQScore);
      }
    }

    // B. Cập nhật toàn bộ các câu nếu có danh sách questionScores
    var qScores = data.questionScores;
    if (qScores && typeof qScores === "object") {
      for (var qK in qScores) {
        var qN = parseInt(qK, 10);
        if (!isNaN(qN) && questionCols[qN] !== undefined) {
          sheet2.getRange(targetRow, questionCols[qN] + 1).setValue(qScores[qK]);
        }
      }
    }

    // C. TÍNH LẠI TỔNG SỐ ĐIỂM TỪ BÀI LÀM CỦA HỌC SINH (SUM TOÀN BỘ CÁC CỘT CÂU HỎI)
    var finalCalculatedTotal = 0;
    var hasComputedFromColumns = false;
    var questionColKeys = Object.keys(questionCols);

    if (questionColKeys.length > 0) {
      for (var cIdx = 0; cIdx < questionColKeys.length; cIdx++) {
        var qOrderN = parseInt(questionColKeys[cIdx], 10);
        var qColPos = questionCols[qOrderN];
        var cellVal = sheet2.getRange(targetRow, qColPos + 1).getValue();
        var pts = 0;
        if (typeof cellVal === "number") {
          pts = cellVal;
        } else if (cellVal !== "" && cellVal !== null && cellVal !== undefined) {
          var parsedPts = parseFloat(String(cellVal).replace(",", "."));
          if (!isNaN(parsedPts)) pts = parsedPts;
        }
        finalCalculatedTotal += pts;
      }
      hasComputedFromColumns = true;
    } else if (qScores && typeof qScores === "object" && Object.keys(qScores).length > 0) {
      for (var k2 in qScores) {
        finalCalculatedTotal += Number(qScores[k2]) || 0;
      }
      hasComputedFromColumns = true;
    }

    var finalTotalScore = hasComputedFromColumns ? (Math.round(finalCalculatedTotal * 100) / 100) : totalScore;

    // D. Cập nhật Tổng điểm vào cột Tổng điểm
    if (scoreColIdx !== -1) {
      sheet2.getRange(targetRow, scoreColIdx + 1).setValue(finalTotalScore);
    }

    // E. Cập nhật chuỗi Điểm từng câu vào cột Chi tiết
    if (detailColIdx !== -1 && scoreString) {
      sheet2.getRange(targetRow, detailColIdx + 1).setValue(scoreString);
    }

    SpreadsheetApp.flush();

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      action: "updated",
      message: "Đã cập nhật điểm câu " + targetOrderNum + " và tính lại tổng điểm: " + finalTotalScore + " đ thành công!",
      row: targetRow,
      studentName: studentName,
      totalScore: finalTotalScore,
      targetOrderNumber: targetOrderNum,
      questionScore: targetQScore
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
`;
