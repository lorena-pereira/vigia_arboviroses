document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-cadastrar-paciente');

    const cpfInput = document.getElementById('cpf');
    const cepInput = document.getElementById('cep');
    const telefoneInput = document.getElementById('telefone');
    const numeroSusInput = document.getElementById('numeroSus');
    const dataNascimentoInput = document.getElementById('dataDeNascimento');
    const camposDeTexto = ['nome', 'nomeDaMae', 'racaCor', 'escolaridade'];

    // avisos (usa toast compartilhado quando disponível)
    function showWarning(message) {
        if (window.showToast) {
            window.showToast(message, 'warning');
            return;
        }
        window.alert(message);
    }

    /* formatações */

    // CPF
    if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
            if (e.data && /\D/.test(e.data))
                showWarning('O campo CPF aceita apenas números.');

            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);

            if (value.length > 9) {
                value = value.replace(
                    /(\d{3})(\d{3})(\d{3})(\d{2})/,
                    '$1.$2.$3-$4'
                );
            } else if (value.length > 6) {
                value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
            } else if (value.length > 3) {
                value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
            }
            e.target.value = value;
        });
    }

    // telefone
    if (telefoneInput) {
        telefoneInput.addEventListener('input', (e) => {
            if (e.data && /\D/.test(e.data))
                showWarning('O campo Telefone aceita apenas números.');

            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);

            if (value.length > 10) {
                value = value.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            } else if (value.length > 5) {
                value = value.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
            } else if (value.length > 2) {
                value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
            } else if (value.length > 0) {
                value = value.replace(/^(\d*)/, '($1');
            }
            e.target.value = value;
        });
    }

    // número do SUS
    if (numeroSusInput) {
        numeroSusInput.addEventListener('input', (e) => {
            if (e.data && /\D/.test(e.data))
                showWarning('O Número do SUS aceita apenas números.');

            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 15) value = value.slice(0, 15);

            if (value.length > 11) {
                value = value.replace(
                    /(\d{3})(\d{4})(\d{4})(\d{1,4})/,
                    '$1 $2 $3 $4'
                );
            } else if (value.length > 7) {
                value = value.replace(/(\d{3})(\d{4})(\d{1,4})/, '$1 $2 $3');
            } else if (value.length > 3) {
                value = value.replace(/(\d{3})(\d{1,4})/, '$1 $2');
            }
            e.target.value = value;
        });
    }

    // nomes
    camposDeTexto.forEach((id) => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', (e) => {
                if (e.data && /[^a-zA-ZÀ-ÿ\s]/.test(e.data)) {
                    showWarning(
                        'Este campo não aceita números ou símbolos especiais.'
                    );
                }

                let value = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
                const preposicoes = ['de', 'da', 'do', 'das', 'dos', 'e'];

                value = value
                    .toLowerCase()
                    .split(' ')
                    .map((word) => {
                        if (preposicoes.includes(word)) return word;
                        return word.charAt(0).toUpperCase() + word.slice(1);
                    })
                    .join(' ');

                e.target.value = value;
            });
        }
    });

    // cálculo automático da idade
    if (dataNascimentoInput) {
        dataNascimentoInput.addEventListener('change', (e) => {
            if (e.target.value) {
                const nascimento = new Date(e.target.value);
                const hoje = new Date();
                let idade = hoje.getFullYear() - nascimento.getFullYear();
                const m = hoje.getMonth() - nascimento.getMonth();

                if (
                    m < 0 ||
                    (m === 0 && hoje.getDate() < nascimento.getDate())
                ) {
                    idade--;
                }

                const campoIdade = document.getElementById('idade');
                if (campoIdade) campoIdade.value = idade >= 0 ? idade : 0;
            }
        });
    }

    // CEP e ViaCEP
    if (cepInput) {
        cepInput.addEventListener('input', (e) => {
            if (e.data && /\D/.test(e.data))
                showWarning('O campo CEP aceita apenas números.');

            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 8) value = value.slice(0, 8);
            if (value.length > 5)
                value = value.replace(/(\d{5})(\d{1,3})/, '$1-$2');
            e.target.value = value;
        });

        cepInput.addEventListener('blur', async (e) => {
            const cepLimpo = e.target.value.replace(/\D/g, '');
            if (cepLimpo.length === 8) {
                try {
                    const response = await fetch(
                        `https://viacep.com.br/ws/${cepLimpo}/json/`
                    );
                    const data = await response.json();

                    if (!data.erro) {
                        document.getElementById('logradouro').value =
                            data.logradouro || '';
                        document.getElementById('bairroNome').value =
                            data.bairro || '';
                        document.getElementById('municipio').value =
                            data.localidade || 'Vitória da Conquista';
                        document.getElementById('uf').value = data.uf || 'BA';
                        document.getElementById('numero').focus();
                    } else {
                        if (window.showToast) {
                            window.showToast(
                                'CEP não encontrado na base de dados.',
                                'warning'
                            );
                        } else {
                            alert('CEP não encontrado na base de dados.');
                        }
                    }
                } catch (error) {
                    console.error('Erro na consulta do CEP:', error);
                }
            }
        });
    }

    // envio do formulário
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const pacienteData = Object.fromEntries(formData.entries());

            if (pacienteData.cpf)
                pacienteData.cpf = pacienteData.cpf.replace(/\D/g, '');
            if (pacienteData.cep)
                pacienteData.cep = pacienteData.cep.replace(/\D/g, '');
            if (pacienteData.telefone)
                pacienteData.telefone = pacienteData.telefone.replace(
                    /\D/g,
                    ''
                );
            if (pacienteData.numeroSus)
                pacienteData.numeroSus = pacienteData.numeroSus.replace(
                    /\D/g,
                    ''
                );

            try {
                const response = await fetch('/api/pacientes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(pacienteData),
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    if (window.showToast) {
                        window.showToast(
                            'Paciente cadastrado com sucesso!',
                            'success'
                        );
                    } else {
                        alert('Paciente cadastrado com sucesso!');
                    }
                    form.reset();
                } else {
                    if (window.showToast) {
                        window.showToast(
                            (data && data.message) ||
                                'Erro ao cadastrar paciente.',
                            'error'
                        );
                    } else {
                        alert(data.message || 'Erro ao cadastrar paciente.');
                    }
                }
            } catch (error) {
                console.error('Erro de conexão:', error);
                if (window.showToast) {
                    window.showToast(
                        'Não foi possível conectar ao servidor.',
                        'error'
                    );
                } else {
                    alert('Não foi possível conectar ao servidor.');
                }
            }
        });
    }
});
